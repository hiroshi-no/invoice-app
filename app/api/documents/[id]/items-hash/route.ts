export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createHash } from 'node:crypto'

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

export async function GET(req: NextRequest, ctx: RouteContext) {
  const params = 'then' in ctx.params ? await ctx.params : ctx.params
  const documentId = String(params.id ?? '')

  if (!UUID_RE.test(documentId)) {
    return NextResponse.json({ error: 'Invalid document id' }, { status: 400 })
  }

  const { supabase, cookiesToSet } = createSupabase(req)

  const json = (body: any, status = 200) => {
    const res = NextResponse.json(body, { status })
    for (const c of cookiesToSet) res.cookies.set(c.name, c.value, c.options)
    res.headers.set('Cache-Control', 'no-store')
    return res
  }

  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) return json({ error: 'Not authenticated' }, 401)

  // doc存在確認（RLSで見えなければ404）
  const { data: doc } = await supabase.from('documents').select('id').eq('id', documentId).maybeSingle()
  if (!doc) return json({ error: 'Document not found' }, 404)

  const { data: items, error: itemsErr } = await supabase
    .from('document_items')
    .select('position, description, quantity, unit_price_amount, line_subtotal_amount')
    .eq('document_id', documentId)
    .order('position', { ascending: true })

  if (itemsErr) return json({ error: itemsErr.message }, 500)

  // 安定化のため正規化して hash（順序・nullの扱いを固定）
  const normalized = (items ?? []).map((it: any) => ({
    position: Number(it.position ?? 0),
    description: it.description ?? null,
    quantity: Number(it.quantity ?? 0),
    unit_price_amount: Number(it.unit_price_amount ?? 0),
    line_subtotal_amount: it.line_subtotal_amount == null ? null : Number(it.line_subtotal_amount),
  }))

  const itemsHash = createHash('sha256').update(JSON.stringify(normalized)).digest('hex')
  return json({ ok: true, itemsHash }, 200)
}
