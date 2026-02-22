export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { computeItemsHashFromDbRows } from '@/lib/itemsHash'

type RouteContext =
  | { params: { id: string } }
  | { params: Promise<{ id: string }> }

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function createSupabaseServerClient(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) throw new Error('Missing Supabase env vars')

  const cookiesToSet: Array<{ name: string; value: string; options?: any }> = []

  const supabase = createServerClient(url, anonKey, {
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

async function issueViaRpc(supabase: any, documentId: string) {
  const { data, error } = await supabase.rpc('issue_document', {
    p_document_id: documentId,
    // p_issued_at: new Date().toISOString().slice(0, 10), // ←必要なら有効化
  })
  return { data, error }
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const params = await Promise.resolve((ctx as any).params)
  const documentId = String((params as any).id ?? '')

  if (!UUID_RE.test(documentId)) {
    return NextResponse.json({ error: 'Invalid document id' }, { status: 400 })
  }

  const { supabase, cookiesToSet } = createSupabaseServerClient(req)

  const respond = (body: any, init?: ResponseInit) => {
    const res = NextResponse.json(body, init)
    for (const c of cookiesToSet) res.cookies.set(c.name, c.value, c.options)
    return res
  }

  try {
    // auth
    const { data: userData, error: userErr } = await supabase.auth.getUser()
    if (userErr || !userData.user) {
      return respond({ error: userErr?.message ?? 'Not authenticated' }, { status: 401 })
    }

    // documents.status を見て draft 以外を 409（RLSで見えない時は 404）
    const { data: docHead, error: headErr } = await supabase
      .from('documents')
      .select('id,status')
      .eq('id', documentId)
      .single()

    if (headErr) {
      if ((headErr as any).code === 'PGRST116') return respond({ error: 'Document not found' }, { status: 404 })
      return respond({ error: headErr.message }, { status: 500 })
    }
    if (!docHead) return respond({ error: 'Document not found' }, { status: 404 })

    if (docHead.status !== 'draft') {
      return respond({ error: 'document status must be draft' }, { status: 409 })
    }

    // 409ガード：未保存発行防止（x-items-hash）
    const clientHash = (req.headers.get('x-items-hash') ?? '').trim().toLowerCase()
    if (!clientHash) {
      return respond({ error: 'Precondition required: x-items-hash' }, { status: 428 })
    }

const { data: dbItems, error: itemsErr } = await supabase
  .from('document_items')
  .select('id, position, description, quantity, unit_price_amount, line_subtotal_amount')
  .eq('document_id', documentId)
  .order('position', { ascending: true })
  .order('id', { ascending: true })

if (itemsErr) return respond({ error: itemsErr.message ?? 'Failed to load items' }, { status: 500 })

type HashRow = {
  position: number
  description: string | null
  quantity: number
  unit_price_amount: number
  line_subtotal_amount: number | null
}

const rowsForHash: HashRow[] = (dbItems ?? []).map((it: any) => ({
  position: Number(it.position ?? 0),
  description: it.description ?? null,
  quantity: Number(it.quantity ?? 0),
  unit_price_amount: Number(it.unit_price_amount ?? 0),
  line_subtotal_amount: it.line_subtotal_amount == null ? null : Number(it.line_subtotal_amount),
}))

const dbHash = computeItemsHashFromDbRows(rowsForHash as unknown as HashRow[]).toLowerCase()

    if (clientHash !== dbHash) {
      return respond(
        {
          error: 'items_not_saved',
          message:
            '明細が未保存（またはDBと不一致）のため発行できません。編集画面で保存してから再実行してください。',
          expected: dbHash, // 本番は消してOK
          got: clientHash,  // 本番は消してOK
        },
        { status: 409 }
      )
    }

    // 採番＋issued化（DB関数）
    const { data: rpcData, error: rpcErr } = await issueViaRpc(supabase, documentId)
    if (rpcErr) {
      const msg = String(rpcErr.message ?? '').toLowerCase()
      const status = msg.includes('draft') ? 409 : 400
      return respond({ error: rpcErr.message ?? 'issue rpc failed' }, { status })
    }

    // 再取得（RLSで見えないなら404）
    const { data: doc, error: docErr } = await supabase
      .from('documents')
      .select('id,status,document_no,issued_at,currency,customer_id,subtotal_amount,tax_amount,total_amount')
      .eq('id', documentId)
      .single()

    if (docErr) {
      if ((docErr as any).code === 'PGRST116') return respond({ error: 'Document not found' }, { status: 404 })
      return respond({ error: docErr.message }, { status: 500 })
    }
    if (!doc) return respond({ error: 'Document not found' }, { status: 404 })

    if (doc.status !== 'issued') {
      return respond({ error: 'Issue did not change status to issued' }, { status: 500 })
    }

    return respond({ ok: true, document: doc, rpc: rpcData ?? null }, { status: 200 })
  } catch (e: any) {
    return respond({ error: e?.message ?? 'Internal Server Error' }, { status: 500 })
  }
}
