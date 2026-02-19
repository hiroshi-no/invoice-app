export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { calcTotals } from '@/lib/calc'

type RouteContext =
  | { params: { id: string } }
  | { params: Promise<{ id: string }> }

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

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

export async function POST(req: NextRequest, ctx: RouteContext) {
  const params = 'then' in ctx.params ? await ctx.params : ctx.params
  const sourceId = String(params.id ?? '')

  const { supabase, cookiesToSet } = createSupabase(req)

  const respond = (body: any, status = 200) => {
    const res = NextResponse.json(body, { status })
    for (const c of cookiesToSet) res.cookies.set(c.name, c.value, c.options)
    return res
  }

  if (!UUID_RE.test(sourceId)) {
    return respond({ error: 'Invalid document id' }, 400)
  }

  // auth
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) {
    return respond({ error: userErr?.message ?? 'Not authenticated' }, 401)
  }
  const userId = userData.user.id

  // source document（RLSで見えない場合は 404）
  const { data: src, error: srcErr } = await supabase
    .from('documents')
    .select('id, doc_type, due_date, customer_id, currency, title, notes')
    .eq('id', sourceId)
    .single()

  if (srcErr) {
    // single() は 0件だと error になるので、404扱いに寄せる
    const msg = srcErr.message ?? 'Source document not found'
    const status = msg.toLowerCase().includes('0 rows') ? 404 : 500
    return respond({ error: msg }, status)
  }

  // source items
  const { data: srcItems, error: itemsErr } = await supabase
    .from('document_items')
    .select('position, description, quantity, unit_price_amount, line_subtotal_amount')
    .eq('document_id', sourceId)
    .order('position', { ascending: true })

  if (itemsErr) return respond({ error: itemsErr.message }, 500)

  // ✅ subtotal（line_subtotal_amount 優先。無い時だけ qty*unit）
  const currency = String(src.currency ?? 'JPY')
  const subtotal = (srcItems ?? []).reduce((acc: number, it: any) => {
    const qty = Number(it.quantity ?? 0)
    const unit = Number(it.unit_price_amount ?? 0)
    const dbLineRaw = it.line_subtotal_amount
    const line = dbLineRaw == null ? Math.round(qty * unit) : Number(dbLineRaw ?? 0)
    return acc + (Number.isFinite(line) ? line : 0)
  }, 0)

  // ✅ totals をDBに反映（calcTotals の戻り値の形が違っても耐える）
  const t: any = calcTotals(subtotal, currency)
  const subtotal_amount = Number(t?.subtotal_amount ?? t?.subtotal ?? subtotal)
  const tax_amount = Number(t?.tax_amount ?? t?.tax ?? 0)
  const total_amount = Number(t?.total_amount ?? t?.total ?? subtotal_amount + tax_amount)

  const newDocPayload: any = {
    doc_type: src.doc_type,
    status: 'draft',

    document_no: null,
    issue_year: null,
    issued_at: null,

    due_date: src.due_date ?? null,
    customer_id: src.customer_id ?? null,
    currency: src.currency ?? 'JPY',
    title: src.title ?? null,
    notes: src.notes ?? null,

    subtotal_amount,
    tax_amount,
    total_amount,

    // ✅ 個人専用：RLSに合わせて created_by を入れる
    created_by: userId,
  }

  // insert（select('*') をやめて最小限の返却に）
  const { data: newDoc, error: insErr } = await supabase
    .from('documents')
    .insert(newDocPayload)
    .select('id')
    .single()

  if (insErr) return respond({ error: insErr.message }, 500)
  if (!newDoc?.id) return respond({ error: 'Failed to create draft' }, 500)

  // copy items（positionを維持）
  const itemsToInsert = (srcItems ?? []).map((it: any, idx: number) => ({
    document_id: newDoc.id,
    position: it.position ?? idx + 1,
    description: it.description ?? null,
    quantity: it.quantity ?? 0,
    unit_price_amount: it.unit_price_amount ?? 0,
    line_subtotal_amount: it.line_subtotal_amount ?? null,
    // created_by 列が document_items に存在して NOT NULL の場合だけ追加
    // created_by: userId,
  }))

  if (itemsToInsert.length > 0) {
    const { error: insItemsErr } = await supabase.from('document_items').insert(itemsToInsert)
    if (insItemsErr) return respond({ error: insItemsErr.message }, 500)
  }

  // UIが取り回ししやすい返却（idだけで十分）
  return respond({ ok: true, id: newDoc.id }, 200)
}
