export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { computeItemsHashFromDbRows, type DbItemRowForHash } from '@/lib/itemsHash'

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

function respondJson(cookiesToSet: any[], body: any, init?: ResponseInit) {
  const res = NextResponse.json(body, init)
  for (const c of cookiesToSet) res.cookies.set(c.name, c.value, c.options)
  res.headers.set('Cache-Control', 'no-store')
  return res
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  const { supabase, cookiesToSet } = createSupabase(req)

  const params = 'then' in (ctx.params as any) ? await (ctx.params as any) : (ctx.params as any)
  const documentId = String(params?.id ?? '')
  if (!UUID_RE.test(documentId)) return respondJson(cookiesToSet, { error: 'Invalid document id' }, { status: 400 })

  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) {
    return respondJson(cookiesToSet, { error: userErr?.message ?? 'Not authenticated' }, { status: 401 })
  }

  // doc → orgId確定（RLSで見えない場合も 404）
  const { data: doc, error: docErr } = await supabase
    .from('documents')
    .select('id, org_id')
    .eq('id', documentId)
    .maybeSingle()

  if (docErr) return respondJson(cookiesToSet, { error: docErr.message }, { status: 500 })
  if (!doc) return respondJson(cookiesToSet, { error: 'document_not_found' }, { status: 404 })

  const orgId = String((doc as any).org_id ?? '')
  if (!UUID_RE.test(orgId)) return respondJson(cookiesToSet, { error: 'org_id invalid' }, { status: 500 })

  const { data: items, error: itemsErr } = await supabase
    .from('document_items')
    .select('id, position, description, quantity, unit_price_amount, line_subtotal_amount')
    .eq('document_id', documentId)
    .eq('org_id', orgId)
    .order('position', { ascending: true })
    .order('id', { ascending: true })

  if (itemsErr) return respondJson(cookiesToSet, { error: itemsErr.message }, { status: 500 })

  const rowsForHash = (items ?? []).map((it: any) => ({
    position: Number(it.position ?? 0),
    description: it.description ?? null,
    quantity: Number(it.quantity ?? 0),
    unit_price_amount: Number(it.unit_price_amount ?? 0),
    line_subtotal_amount: it.line_subtotal_amount == null ? null : Number(it.line_subtotal_amount),
  }))

  const h = computeItemsHashFromDbRows(rowsForHash as DbItemRowForHash[]).toLowerCase()

  return respondJson(
    cookiesToSet,
    { ok: true, org_id: orgId, document_id: documentId, items_hash: h, hash: h, itemsHash: h },
    { status: 200 }
  )
}