// app/api/documents/[id]/issue/route.ts
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

import { createSupabaseServerClient } from '@/lib/api/supabase-server'
import { respondJson } from '@/lib/api/response'
import { withDebug } from '@/lib/debug'
import { computeItemsHashFromDbRows } from '@/lib/itemsHash'

type RouteContext =
  | { params: { id: string } }
  | { params: Promise<{ id: string }> }

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type HashRow = {
  position: number
  description: string | null
  quantity: number
  unit_price_amount: number
  line_subtotal_amount: number | null
}

async function issueViaRpc(supabase: any, documentId: string) {
  const { data, error } = await supabase.rpc('issue_document', {
    p_document_id: documentId,
    // p_issued_at: new Date().toISOString().slice(0, 10),
  })
  return { data, error }
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const params = await Promise.resolve((ctx as any).params)
  const documentId = String((params as any).id ?? '')

  if (!UUID_RE.test(documentId)) {
    return NextResponse.json(
      {
        error: 'invalid_document_id',
        message: '不正なドキュメントIDです。',
      },
      { status: 400 }
    )
  }

  const { supabase, cookiesToSet } = createSupabaseServerClient(req)

  const respond = (body: any, init?: ResponseInit) => {
    return respondJson(cookiesToSet, body, init)
  }

  const respondErr = (
    error: string,
    message: string,
    status = 500,
    debug?: Record<string, unknown>
  ) => {
    return respond(
      {
        error,
        message,
        ...withDebug(debug),
      },
      { status }
    )
  }

  try {
    const { data: userData, error: userErr } = await supabase.auth.getUser()
    if (userErr || !userData.user) {
      return respondErr(
        'not_authenticated',
        'ログインが切れました。再ログインしてください。',
        401,
        { detail: userErr?.message }
      )
    }

    const { data: docHead, error: headErr } = await supabase
      .from('documents')
      .select('id, org_id, status')
      .eq('id', documentId)
      .maybeSingle()

    if (headErr) {
      return respondErr(
        'document_fetch_failed',
        '帳票データの取得に失敗しました。時間をおいて再実行してください。',
        500,
        { detail: headErr.message }
      )
    }

    if (!docHead) {
      return respondErr('document_not_found', '対象が見つかりません。', 404)
    }

    const orgId = String((docHead as any).org_id ?? '')
    if (!UUID_RE.test(orgId)) {
      return respondErr(
        'document_org_not_found',
        '帳票データが不正です。時間をおいて再実行してください。',
        500,
        { detail: 'Document org_id not found' }
      )
    }

    if ((docHead as any).status !== 'draft') {
      return respondErr(
        'invalid_document_status',
        'この帳票は発行できません。下書き状態を確認してください。',
        409,
        { detail: (docHead as any).status }
      )
    }

    const clientHash = (req.headers.get('x-items-hash') ?? '').trim().toLowerCase()
    if (!clientHash) {
      return respondErr(
        'precondition_required',
        '明細ハッシュが必要です。編集画面で保存してから再実行してください。',
        428
      )
    }

    const { data: dbItems, error: itemsErr } = await supabase
      .from('document_items')
      .select('id, position, description, quantity, unit_price_amount, line_subtotal_amount')
      .eq('document_id', documentId)
      .eq('org_id', orgId)
      .order('position', { ascending: true })
      .order('id', { ascending: true })

    if (itemsErr) {
      return respondErr(
        'items_fetch_failed',
        '明細の取得に失敗しました。時間をおいて再実行してください。',
        500,
        { detail: itemsErr.message ?? 'Failed to load items' }
      )
    }

    const rowsForHash: HashRow[] = (dbItems ?? []).map((it: any) => ({
      position: Number(it.position ?? 0),
      description: it.description ?? null,
      quantity: Number(it.quantity ?? 0),
      unit_price_amount: Number(it.unit_price_amount ?? 0),
      line_subtotal_amount:
        it.line_subtotal_amount == null ? null : Number(it.line_subtotal_amount),
    }))

    const dbHash = computeItemsHashFromDbRows(rowsForHash).toLowerCase()

    if (clientHash !== dbHash) {
      return respond(
        {
          error: 'items_not_saved',
          message:
            '明細が未保存（またはDBと不一致）のため発行できません。編集画面で保存してから再実行してください。',
          ...withDebug({
            expected: dbHash,
            got: clientHash,
          }),
        },
        { status: 409 }
      )
    }

    const { data: rpcData, error: rpcErr } = await issueViaRpc(supabase, documentId)
    if (rpcErr) {
      const rpcMsg = String(rpcErr.message ?? '').toLowerCase()
      const status = rpcMsg.includes('draft') ? 409 : 400

      return respondErr(
        'issue_rpc_failed',
        status === 409
          ? 'この帳票は発行できません。状態を確認してください。'
          : '発行に失敗しました。時間をおいて再実行してください。',
        status,
        { detail: rpcErr.message ?? 'issue rpc failed' }
      )
    }

    const { data: doc, error: docErr } = await supabase
      .from('documents')
      .select(
        'id, org_id, status, document_no, issued_at, currency, customer_id, subtotal_amount, tax_amount, total_amount'
      )
      .eq('id', documentId)
      .eq('org_id', orgId)
      .maybeSingle()

    if (docErr) {
      return respondErr(
        'document_refetch_failed',
        '発行後の帳票取得に失敗しました。時間をおいて再実行してください。',
        500,
        { detail: docErr.message }
      )
    }

    if (!doc) {
      return respondErr('document_not_found', '対象が見つかりません。', 404)
    }

    if ((doc as any).status !== 'issued') {
      return respondErr(
        'issue_status_not_updated',
        '発行結果の反映を確認できませんでした。時間をおいて再確認してください。',
        500,
        { detail: 'Issue did not change status to issued' }
      )
    }

    return respond({ ok: true, document: doc, rpc: rpcData ?? null }, { status: 200 })
  } catch (e: any) {
    return respondErr(
      'issue_failed',
      '発行に失敗しました。時間をおいて再実行してください。',
      500,
      { detail: e?.message ?? 'Internal Server Error' }
    )
  }
}