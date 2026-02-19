export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { calcTotals } from '@/lib/calc'

type RouteContext = { params: { id: string } } | { params: Promise<{ id: string }> }

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function num(v: any) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function createSupabase(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const cookiesToSet: Array<{ name: string; value: string; options?: any }> = []

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return req.cookies.getAll().map((c) => ({ name: c.name, value: c.value }))
      },
      setAll(list) {
        cookiesToSet.push(...list)
      },
    },
  })

  return { supabase, cookiesToSet }
}

export async function PUT(req: NextRequest, ctx: RouteContext) {
  // ✅ params が Promise の場合もあるので unwrap
  const p = 'then' in (ctx as any).params ? await (ctx as any).params : (ctx as any).params
  const documentId = String(p?.id ?? '')

  if (!UUID_RE.test(documentId)) {
    return NextResponse.json({ error: 'Invalid document id' }, { status: 400 })
  }

  const { supabase, cookiesToSet } = createSupabase(req)

  // ✅ どのreturnでもCookieを積む（SSR auth 安定化）
  const respond = (body: any, init?: ResponseInit) => {
    const res = NextResponse.json(body, init)
    for (const c of cookiesToSet) res.cookies.set(c.name, c.value, c.options)
    return res
  }

  // auth
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) {
    return respond({ error: userErr?.message ?? 'Not authenticated' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const items = body?.items
  const deleteIds = body?.deleteIds

  if (!Array.isArray(items)) {
    return respond({ error: 'items must be array' }, { status: 400 })
  }
  if (deleteIds != null && !Array.isArray(deleteIds)) {
    return respond({ error: 'deleteIds must be array' }, { status: 400 })
  }
  if (items.length > 500) {
    return respond({ error: 'too many items' }, { status: 400 })
  }

  // documents を読み、draft以外は編集不可
  const { data: docs, error: docErr } = await supabase
    .from('documents')
    .select('id, status, currency')
    .eq('id', documentId)
    .limit(1)

  if (docErr) return respond({ error: docErr.message }, { status: 500 })
  const doc = docs?.[0]
  if (!doc) return respond({ error: 'Document not found' }, { status: 404 })
  if (doc.status !== 'draft') {
    return respond({ error: 'document status must be draft' }, { status: 409 })
  }

  // ✅ position を payload順で 1..N に正規化
  const normalized = items.map((it: any, idx: number) => ({
    ...it,
    position: idx + 1,
  }))

  // 1) delete
  if (Array.isArray(deleteIds) && deleteIds.length > 0) {
    for (const id of deleteIds) {
      if (!UUID_RE.test(String(id))) return respond({ error: 'Invalid deleteIds' }, { status: 400 })
    }
    const { error: delErr } = await supabase
      .from('document_items')
      .delete()
      .in('id', deleteIds)
      .eq('document_id', documentId)

    if (delErr) return respond({ error: delErr.message }, { status: 500 })
  }

  // 2) insert（id無し行）
  // ✅ line_subtotal_amount は送らない（DBトリガー計算に統一）
  const toInsert = normalized
    .filter((it: any) => !it?.id)
    .map((it: any) => ({
      document_id: documentId,
      position: it.position,
      description: it.description ?? '',
      quantity: num(it.quantity),
      unit_price_amount: Math.round(num(it.unit_price_amount)),
    }))

  if (toInsert.length > 0) {
    const { error: insErr } = await supabase.from('document_items').insert(toInsert)
    if (insErr) return respond({ error: insErr.message }, { status: 500 })
  }

  // 3) update（id有り行）
  const toUpdate = normalized.filter((it: any) => it?.id)
  for (const it of toUpdate) {
    if (!UUID_RE.test(String(it.id))) return respond({ error: 'Invalid item.id' }, { status: 400 })
  }

  const updateResults = await Promise.all(
    toUpdate.map((it: any) => {
      const patch = {
        position: num(it.position),
        description: it.description ?? '',
        quantity: num(it.quantity),
        unit_price_amount: Math.round(num(it.unit_price_amount)),
        // ✅ line_subtotal_amount は送らない（DBトリガー計算）
      }
      return supabase.from('document_items').update(patch).eq('id', it.id).eq('document_id', documentId)
    })
  )

  for (const r of updateResults) {
    if (r.error) return respond({ error: r.error.message }, { status: 500 })
  }

  // 4) 反映確認：最新items + totals（DBの line_subtotal_amount を合計）
  const { data: updated, error: readErr } = await supabase
    .from('document_items')
    .select('id, document_id, position, description, quantity, unit_price_amount, line_subtotal_amount')
    .eq('document_id', documentId)
    .order('position', { ascending: true })

  if (readErr) return respond({ error: readErr.message }, { status: 500 })

  const subtotal = (updated ?? []).reduce((sum: number, r: any) => sum + num(r.line_subtotal_amount), 0)

  const currency = String(doc.currency ?? 'JPY')
  const totals = calcTotals(subtotal, currency)

  // documents の合計も更新（失敗しても warn に載せる）
  const { error: upDocErr } = await supabase
    .from('documents')
    .update({
      subtotal_amount: totals.subtotal,
      tax_amount: totals.tax,
      total_amount: totals.total,
    })
    .eq('id', documentId)

  return respond({ ok: true, items: updated ?? [], totals, warn: upDocErr ? upDocErr.message : null }, { status: 200 })
}
