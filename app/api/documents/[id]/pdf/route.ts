// app/api/documents/[id]/pdf/route.ts
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { Buffer } from 'node:buffer'

import { createSupabaseServerClient } from '@/lib/api/supabase-server'
import { applyCookies, respondJson } from '@/lib/api/response'
import { calcTotals } from '@/lib/calc'
import { withDebug } from '@/lib/debug'
import { loadOrgBranding } from '@/lib/pdf/branding'
import { buildInvoiceHtml } from '@/lib/pdf/buildInvoiceHtml'
import { renderPdfFromHtml } from '@/lib/pdf/render'
import { enforceRateLimit } from '@/lib/rateLimit'

type RouteContext =
  | { params: { id: string } }
  | { params: Promise<{ id: string }> }

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function num(v: any) {
  if (v == null) return 0
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  const params = await Promise.resolve((ctx as any).params)
  const documentId = String((params as any).id ?? '')

  const { supabase, cookiesToSet } = createSupabaseServerClient(req)

  const withCookies = (res: NextResponse) => applyCookies(res, cookiesToSet)

  const respondErr = (body: any, status = 500) => {
    return respondJson(cookiesToSet, body, { status })
  }

  const respondPdf = (pdf: Uint8Array) => {
    const body = Buffer.from(pdf)
    const res = new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="invoice-${documentId}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
    return withCookies(res)
  }

  if (!UUID_RE.test(documentId)) {
    return respondErr({ error: 'invalid_document_id', message: '不正なドキュメントIDです。' }, 400)
  }

  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) {
    return respondErr(
      {
        error: 'not_authenticated',
        message: 'ログインが切れました。再ログインしてください。',
        ...withDebug({ detail: userErr?.message }),
      },
      401
    )
  }

  const limited = await enforceRateLimit(supabase, 'pdf_preview', 2, 60)
  if (limited) return withCookies(limited as NextResponse)

  const { data: doc, error: docErr } = await supabase
    .from('documents')
    .select('id, org_id, customer_id, status, currency, document_no, issued_at')
    .eq('id', documentId)
    .maybeSingle()

  if (docErr) {
    return respondErr(
      {
        error: 'document_fetch_failed',
        message: '帳票データの取得に失敗しました。時間をおいて再実行してください。',
        ...withDebug({ detail: docErr.message }),
      },
      500
    )
  }

  if (!doc) {
    return respondErr({ error: 'document_not_found', message: '対象が見つかりません。' }, 404)
  }

  const orgId = String((doc as any).org_id ?? '')
  if (!UUID_RE.test(orgId)) {
    return respondErr(
      {
        error: 'document_org_not_found',
        message: '帳票データが不正です。時間をおいて再実行してください。',
        ...withDebug({ detail: 'Document org_id not found' }),
      },
      500
    )
  }

  const branding = await loadOrgBranding(supabase as any, orgId)

  let customerName = ''
  if ((doc as any).customer_id) {
    const { data: customer, error: cErr } = await supabase
      .from('customers')
      .select('name')
      .eq('id', (doc as any).customer_id)
      .eq('org_id', orgId)
      .maybeSingle()

    if (!cErr) customerName = String((customer as any)?.name ?? '')
  }

  const { data: items, error: itemsErr } = await supabase
    .from('document_items')
    .select('position, description, quantity, unit_price_amount, line_subtotal_amount')
    .eq('document_id', documentId)
    .eq('org_id', orgId)
    .order('position', { ascending: true })

  if (itemsErr) {
    return respondErr(
      {
        error: 'items_fetch_failed',
        message: '明細の取得に失敗しました。時間をおいて再実行してください。',
        ...withDebug({ detail: itemsErr.message }),
      },
      500
    )
  }

  const rows = (items ?? []).map((it: any) => {
    const qty = num(it.quantity)
    const unit = num(it.unit_price_amount)

    const dbLineRaw = it.line_subtotal_amount
    const line = dbLineRaw == null ? qty * unit : num(dbLineRaw)

    return { description: it.description ?? '', qty, unit, line }
  })

  const subtotal = rows.reduce((a, r) => a + num(r.line), 0)
  const currency = String((doc as any).currency ?? 'JPY')
  const totals = calcTotals(subtotal, currency)

  const html = buildInvoiceHtml({
    title: 'INVOICE',
    documentNo: String((doc as any).document_no ?? (doc as any).id),
    issuedAt: String((doc as any).issued_at ?? ''),
    customerName,
    currency,
    rows,
    totals,
    branding,
  })

  try {
    const pdf = await renderPdfFromHtml(html)
    return respondPdf(pdf as any)
  } catch (e: any) {
    console.error('[pdf/preview] render failed', e)

    return respondErr(
      {
        error: 'pdf_render_failed',
        message: 'PDF生成に失敗しました。時間をおいて再実行してください。',
        ...withDebug({
          detail: e?.message ?? String(e),
        }),
      },
      500
    )
  }
}