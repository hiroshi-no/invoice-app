export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { Buffer } from 'node:buffer'

import { createSupabaseServerClient } from '@/lib/api/supabase-server'
import { applyCookies, respondJson } from '@/lib/api/response'
import { withDebug } from '@/lib/debug'
import { loadOrgBranding } from '@/lib/pdf/branding'
import { buildInvoiceHtml } from '@/lib/pdf/buildInvoiceHtml'
import { buildInvoiceViewModel } from '@/lib/pdf/buildInvoiceViewModel'
import { getPdfFontCss } from '@/lib/pdf/fontCss'
import { renderPdfFromHtml } from '@/lib/pdf/render'
import { computePreviewHash } from '@/lib/pdf/previewHash'
import { enforceRateLimit } from '@/lib/rateLimit'

type RouteContext =
  | { params: { id: string } }
  | { params: Promise<{ id: string }> }

type PreviewOverrideBody = {
  customer_id?: string | null
  customer_name?: string | null
  customer_honorific?: string | null
  title?: string | null
  notes?: string | null
  due_date?: string | null
  template_profile?: 'standard' | 'creator' | 'interior' | null
  extended_meta?: Record<string, unknown> | null
  items?: Array<{
    description?: string | null
    quantity?: number | null
    unit_price_amount?: number | null
    line_subtotal_amount?: number | null
  }>
}

type PreviewCacheEntry = {
  pdf: Buffer
  createdAt: number
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const PREVIEW_CACHE_TTL_MS = 60_000
const previewPdfCache = new Map<string, PreviewCacheEntry>()

function nonEmptyString(v: any) {
  const s = String(v ?? '').trim()
  return s ? s : ''
}

function isUuid(v: any) {
  return typeof v === 'string' && UUID_RE.test(v)
}

function toObject(v: any): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {}
}

function getCachedPreviewPdf(cacheKey: string): Buffer | null {
  const hit = previewPdfCache.get(cacheKey)
  if (!hit) return null

  if (Date.now() - hit.createdAt > PREVIEW_CACHE_TTL_MS) {
    previewPdfCache.delete(cacheKey)
    return null
  }

  return hit.pdf
}

function setCachedPreviewPdf(cacheKey: string, pdf: Uint8Array) {
  previewPdfCache.set(cacheKey, {
    pdf: Buffer.from(pdf),
    createdAt: Date.now(),
  })
}

function prunePreviewCache() {
  const now = Date.now()
  for (const [key, value] of previewPdfCache.entries()) {
    if (now - value.createdAt > PREVIEW_CACHE_TTL_MS) {
      previewPdfCache.delete(key)
    }
  }
}

async function handlePreview(req: NextRequest, ctx: RouteContext, method: 'GET' | 'POST') {
  const params = await Promise.resolve((ctx as any).params)
  const documentId = String((params as any).id ?? '')

  const { supabase, cookiesToSet } = createSupabaseServerClient(req)

  const withCookies = (res: NextResponse) => applyCookies(res, cookiesToSet)

  const respondErr = (body: any, status = 500) => {
    return respondJson(cookiesToSet, body, { status })
  }

  const respondPdf = (pdf: Uint8Array | Buffer) => {
  const body = Buffer.from(pdf)
  const res = new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="invoice-${documentId}.pdf"`,
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
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

  const limited = await enforceRateLimit(supabase, 'pdf_preview', 10, 60)
  if (limited) return withCookies(limited as NextResponse)

  const override: PreviewOverrideBody =
    method === 'POST'
      ? await req.json().catch(() => ({}))
      : {}

  const { data: doc, error: docErr } = await supabase
    .from('documents')
    .select(
      'id, org_id, doc_type, customer_id, customer_name, customer_honorific, status, currency, document_no, issued_at, title, notes, due_date, template_profile, extended_meta'
    )
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

  const effectiveCustomerId =
    isUuid(override?.customer_id) ? override.customer_id : (doc as any).customer_id

  let customer: any = null
  if (effectiveCustomerId) {
    const { data: customerData, error: cErr } = await supabase
      .from('customers')
      .select('name, postal_code, address1, address2, email, phone')
      .eq('id', effectiveCustomerId)
      .eq('org_id', orgId)
      .maybeSingle()

    if (!cErr) {
      customer = customerData ?? null
    }
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

  const docForViewModel = {
    ...(doc as any),
    customer_id: effectiveCustomerId ?? null,
    customer_name:
      override?.customer_name !== undefined
        ? override.customer_name
        : (doc as any).customer_name,
    customer_honorific:
      override?.customer_honorific !== undefined
        ? override.customer_honorific
        : (doc as any).customer_honorific,
    title:
      override?.title !== undefined
        ? override.title
        : (doc as any).title,
    notes:
      override?.notes !== undefined
        ? override.notes
        : (doc as any).notes,
    due_date:
      override?.due_date !== undefined
        ? override.due_date
        : (doc as any).due_date,
    template_profile:
      override?.template_profile !== undefined
        ? override.template_profile
        : (doc as any).template_profile,
    extended_meta:
      override?.extended_meta !== undefined
        ? toObject(override.extended_meta)
        : toObject((doc as any).extended_meta),
  }

  const itemsForViewModel =
    Array.isArray(override?.items)
      ? override.items
      : (items ?? [])

  const previewHashInput = {
    doc: {
      id: documentId,
      doc_type: String((docForViewModel as any).doc_type ?? ''),
      customer_id: (docForViewModel as any).customer_id ?? null,
      customer_name: nonEmptyString((docForViewModel as any).customer_name),
      customer_honorific: nonEmptyString((docForViewModel as any).customer_honorific),
      currency: nonEmptyString((docForViewModel as any).currency),
      document_no: nonEmptyString((docForViewModel as any).document_no),
      issued_at: nonEmptyString((docForViewModel as any).issued_at),
      title: nonEmptyString((docForViewModel as any).title),
      notes: String((docForViewModel as any).notes ?? ''),
      due_date: nonEmptyString((docForViewModel as any).due_date),
      template_profile: String((docForViewModel as any).template_profile ?? 'standard'),
      extended_meta: toObject((docForViewModel as any).extended_meta),
    },
    customer: customer
      ? {
          name: nonEmptyString(customer.name),
          postal_code: nonEmptyString(customer.postal_code),
          address1: nonEmptyString(customer.address1),
          address2: nonEmptyString(customer.address2),
          email: nonEmptyString(customer.email),
          phone: nonEmptyString(customer.phone),
        }
      : null,
    items: (itemsForViewModel ?? []).map((it: any, idx: number) => ({
      position: Number(it?.position ?? idx + 1),
      description: String(it?.description ?? ''),
      quantity: Number(it?.quantity ?? 0),
      unit_price_amount: Number(it?.unit_price_amount ?? 0),
      line_subtotal_amount:
        it?.line_subtotal_amount != null
          ? Number(it.line_subtotal_amount ?? 0)
          : Number(it?.quantity ?? 0) * Number(it?.unit_price_amount ?? 0),
    })),
    branding: {
      brandColor: branding.brandColor,
      templateKey: branding.templateKey,
      footerText: branding.footerText,
      logoDataUri: branding.logoDataUri,
      issuerName: branding.issuerName,
      issuerPostalCode: branding.issuerPostalCode,
      issuerAddress1: branding.issuerAddress1,
      issuerAddress2: branding.issuerAddress2,
      issuerEmail: branding.issuerEmail,
      issuerPhone: branding.issuerPhone,
      issuerFax: branding.issuerFax,
    },
  }

  const previewHash = computePreviewHash(previewHashInput)
  const cacheKey = `${documentId}:${previewHash}`

  prunePreviewCache()

  const cachedPdf = getCachedPreviewPdf(cacheKey)
  if (cachedPdf) {
    return respondPdf(cachedPdf)
  }

  const viewModel = buildInvoiceViewModel({
    doc: docForViewModel,
    customer: customer as any,
    items: itemsForViewModel as any[],
    branding,
  })

  const html = buildInvoiceHtml({
    ...viewModel,
    fontCss: getPdfFontCss(),
  })

  try {
    const pdf = await renderPdfFromHtml(html)
    setCachedPreviewPdf(cacheKey, pdf as Uint8Array)
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

export async function GET(req: NextRequest, ctx: RouteContext) {
  return handlePreview(req, ctx, 'GET')
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  return handlePreview(req, ctx, 'POST')
}