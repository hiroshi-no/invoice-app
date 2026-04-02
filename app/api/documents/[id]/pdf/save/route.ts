export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'
import { Buffer } from 'node:buffer'

import { createSupabaseServerClient } from '@/lib/api/supabase-server'
import { respondJson } from '@/lib/api/response'
import { withDebug } from '@/lib/debug'
import { computeItemsHashFromDbRows, type DbItemRowForHash } from '@/lib/itemsHash'
import { loadOrgBranding } from '@/lib/pdf/branding'
import { buildInvoiceHtml } from '@/lib/pdf/buildInvoiceHtml'
import { buildInvoiceViewModel } from '@/lib/pdf/buildInvoiceViewModel'
import { getPdfFontCss } from '@/lib/pdf/fontCss'
import { renderPdfFromHtml } from '@/lib/pdf/render'
import { enforceRateLimit } from '@/lib/rateLimit'
import {
  assertCanSavePdfHistory,
  PlanLimitError,
  toPlanLimitJson,
} from '@/lib/billing/guards'
import { incrementSavedPdfCount } from '@/lib/billing/usage'

type RouteContext =
  | { params: { id: string } }
  | { params: Promise<{ id: string }> }

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function sanitizeFileNamePart(value?: string | null) {
  const raw = String(value ?? '').trim()
  if (!raw) return ''

  return raw
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function getDocTypeLabel(docType?: string | null) {
  const v = String(docType ?? '').trim().toLowerCase()

  if (v === 'invoice') return '請求書'
  if (v === 'quotation' || v === 'quote' || v === 'estimate') return '見積書'
  return '書類'
}

function getDefaultDocumentNo(docType?: string | null) {
  const v = String(docType ?? '').trim().toLowerCase()

  if (v === 'invoice') return 'invoice'
  if (v === 'quotation' || v === 'quote' || v === 'estimate') return 'quotation'
  return 'document'
}

function buildPdfFileName(params: {
  docType?: string | null
  documentNo?: string | null
  version?: number | null
}) {
  const label = sanitizeFileNamePart(getDocTypeLabel(params.docType))
  const no =
    sanitizeFileNamePart(params.documentNo) ||
    getDefaultDocumentNo(params.docType)

  const version =
    Number.isFinite(Number(params.version)) && Number(params.version) > 0
      ? Number(params.version)
      : 1

  return `${label}_${no}_v${version}.pdf`
}

function getDocTypeStorageLabel(docType?: string | null) {
  const v = String(docType ?? '').trim().toLowerCase()

  if (v === 'invoice') return 'invoice'
  if (v === 'quotation' || v === 'quote' || v === 'estimate') return 'quotation'
  return 'document'
}

function buildStoragePdfFileName(params: {
  docType?: string | null
  documentNo?: string | null
  version?: number | null
}) {
  const label = getDocTypeStorageLabel(params.docType)

  const rawNo =
    String(params.documentNo ?? '').trim() || getDefaultDocumentNo(params.docType)

  const no =
    rawNo
      .replace(/[\\/:*?"<>|]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/[^A-Za-z0-9_.-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '') || 'document'

  const version =
    Number.isFinite(Number(params.version)) && Number(params.version) > 0
      ? Number(params.version)
      : 1

  return `${label}_${no}_v${version}.pdf`
}

function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, serviceKey, { auth: { persistSession: false } })
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const params = await Promise.resolve((ctx as any).params)
  const documentId = String((params as any).id ?? '')

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

  if (!UUID_RE.test(documentId)) {
    return respondErr('invalid_document_id', '不正なドキュメントIDです。', 400)
  }

  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) {
    return respondErr(
      'not_authenticated',
      'ログインが切れました。再ログインしてください。',
      401,
      { detail: userErr?.message }
    )
  }
  const userId = userData.user.id

  const isInternal = req.headers.get('x-internal-call') === '1'
  if (process.env.NODE_ENV !== 'production') {
    console.log('[pdf/save] called. internal=', isInternal)
  }

  if (!isInternal) {
    const limited = await enforceRateLimit(supabase, 'pdf_save', 10, 60)
    if (limited) return limited
  }

  const clientHash = (req.headers.get('x-items-hash') ?? '').trim().toLowerCase()
  if (!clientHash) {
    return respondErr(
      'precondition_required',
      '明細ハッシュが必要です。編集画面で保存してから再実行してください。',
      428
    )
  }

  const { data: doc, error: docErr } = await supabase
    .from('documents')
    .select('id, org_id, doc_type, customer_id, customer_name, customer_honorific, status, currency, document_no, issued_at, title, notes, due_date')
    .eq('id', documentId)
    .maybeSingle()

  if (docErr) {
    return respondErr(
      'document_fetch_failed',
      '帳票データの取得に失敗しました。時間をおいて再実行してください。',
      500,
      { detail: docErr.message }
    )
  }

  if (!doc) {
    return respondErr('document_not_found', '対象が見つかりません。', 404)
  }

  if (!doc.org_id) {
    return respondErr(
      'document_org_not_found',
      '帳票データが不正です。時間をおいて再実行してください。',
      500,
      { detail: 'Document org_id not found' }
    )
  }
  const orgId = String(doc.org_id)

  if (doc.status !== 'draft' && doc.status !== 'issued') {
    return respondErr(
      'invalid_document_status',
      'この帳票ステータスではPDF保存できません。',
      409,
      { detail: doc.status }
    )
  }

  const { data: items, error: itemsErr } = await supabase
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
      { detail: itemsErr.message }
    )
  }

  const rowsForHash = (items ?? []).map((it: any) => ({
    position: Number(it.position ?? 0),
    description: it.description ?? null,
    quantity: Number(it.quantity ?? 0),
    unit_price_amount: Number(it.unit_price_amount ?? 0),
    line_subtotal_amount:
      it.line_subtotal_amount == null ? null : Number(it.line_subtotal_amount),
  }))

  const dbHash = computeItemsHashFromDbRows(
    rowsForHash as DbItemRowForHash[]
  ).toLowerCase()

  if (clientHash !== dbHash) {
    return respond(
      {
        error: 'items_not_saved',
        message:
          '明細が未保存（またはDBと不一致）のため保存できません。編集画面で保存してから再実行してください。',
        ...withDebug({
          expected: dbHash,
          got: clientHash,
        }),
      },
      { status: 409 }
    )
  }

  // --------------------------------------------------
  // billing: PDF履歴保存上限チェック
  // --------------------------------------------------
  const { count: currentHistoryCount, error: historyCountErr } = await supabase
    .from('document_files')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .eq('document_id', documentId)

  if (historyCountErr) {
    return respondErr(
      'pdf_history_count_failed',
      'PDF履歴件数の確認に失敗しました。時間をおいて再実行してください。',
      500,
      { detail: historyCountErr.message, orgId, documentId }
    )
  }

  let billingInfo:
    | { plan: 'free' | 'starter' | 'standard'; remaining: number | null }
    | null = null

  try {
    billingInfo = await assertCanSavePdfHistory(
      supabase as any,
      orgId,
      currentHistoryCount ?? 0
    )
  } catch (err) {
    if (err instanceof PlanLimitError) {
      return respond(toPlanLimitJson(err), { status: err.status })
    }

    return respondErr(
      'pdf_history_plan_check_failed',
      'プラン確認に失敗しました。時間をおいて再実行してください。',
      500,
      { detail: (err as any)?.message ?? String(err), orgId, documentId }
    )
  }

  let customer: any = null
  if (doc.customer_id) {
    const { data: customerData, error: cErr } = await supabase
      .from('customers')
      .select('name, postal_code, address1, address2, email, phone')
      .eq('id', doc.customer_id)
      .eq('org_id', orgId)
      .maybeSingle()

    if (!cErr) {
      customer = customerData ?? null
    }
  }

  const branding = await loadOrgBranding(supabase as any, orgId)

  const viewModel = buildInvoiceViewModel({
    doc: doc as any,
    customer: customer as any,
    items: (items ?? []) as any[],
    branding,
  })

  const html = buildInvoiceHtml({
    ...viewModel,
    fontCss: getPdfFontCss(),
  })

  const totals = viewModel.totals
  const admin = createSupabaseAdmin()

  try {
    const pdf = await renderPdfFromHtml(html)
    const pdfBuf = Buffer.isBuffer(pdf) ? pdf : Buffer.from(pdf as any)

    const { data: versionRows, error: latestErr } = await supabase
      .from('document_files')
      .select('version')
      .eq('document_id', documentId)
      .eq('org_id', orgId)
      .not('version', 'is', null)
      .limit(200)

    if (latestErr) {
      return respondErr(
        'document_file_version_fetch_failed',
        'PDF保存に失敗しました。時間をおいて再実行してください。',
        500,
        { detail: latestErr.message }
      )
    }

    const maxVersion = Math.max(
      0,
      ...(versionRows ?? []).map((row: any) => {
        const n = Number(row?.version ?? 0)
        return Number.isFinite(n) && n > 0 ? n : 0
      })
    )

    const nextVersion = maxVersion + 1

    const pdfFileName = buildPdfFileName({
      docType: doc.doc_type,
      documentNo: doc.document_no ?? null,
      version: nextVersion,
    })

    const storageFileName = buildStoragePdfFileName({
      docType: doc.doc_type,
      documentNo: doc.document_no ?? null,
      version: nextVersion,
    })

    const storagePath = `${orgId}/${documentId}/${Date.now()}_${storageFileName}`

    const { data: up, error: upErr } = await admin.storage
      .from('documents')
      .upload(storagePath, pdfBuf, {
        contentType: 'application/pdf',
        upsert: false,
      })

    if (upErr || !up?.path) {
      return respondErr(
        'storage_upload_failed',
        'PDF保存に失敗しました。時間をおいて再実行してください。',
        500,
        { detail: upErr?.message ?? 'unknown' }
      )
    }

    const { data: signedCheck, error: signedErr } = await admin.storage
      .from('documents')
      .createSignedUrl(storagePath, 60)

    if (signedErr || !signedCheck?.signedUrl) {
      try {
        await admin.storage.from('documents').remove([storagePath])
      } catch {}

      return respondErr(
        'storage_verify_failed',
        'PDF保存に失敗しました。時間をおいて再実行してください。',
        500,
        { detail: signedErr?.message ?? 'no signedUrl' }
      )
    }

    const { data: saved, error: insErr } = await supabase
      .from('document_files')
      .insert({
        org_id: orgId,
        document_id: documentId,
        path: storagePath,
        file_name: pdfFileName,
        created_by: userId,
        version: nextVersion,
      })
      .select('id, created_at, path, file_name, version')
      .single()

    if (insErr || !saved?.id) {
      try {
        await admin.storage.from('documents').remove([storagePath])
      } catch {}

      return respondErr(
        'document_file_insert_failed',
        'PDF保存に失敗しました。時間をおいて再実行してください。',
        500,
        { detail: insErr?.message ?? 'missing id' }
      )
    }

    // --------------------------------------------------
    // billing: PDF保存成功後に月次利用数を加算
    // --------------------------------------------------
    await incrementSavedPdfCount(supabase as any, orgId)

    const { error: updErr } = await supabase
      .from('documents')
      .update({
        subtotal_amount: totals.subtotal,
        tax_amount: totals.tax,
        total_amount: totals.total,
      })
      .eq('id', documentId)
      .eq('org_id', orgId)

    if (updErr) {
      return respond(
        {
          ok: true,
          file: saved,
          totals,
          billing: billingInfo,
          warning: '合計金額の更新に一部失敗しました。',
          ...withDebug({ detail: updErr.message }),
        },
        { status: 200 }
      )
    }

    return respond({ ok: true, file: saved, totals, billing: billingInfo }, { status: 200 })
  } catch (e: any) {
    return respondErr(
      'pdf_save_failed',
      'PDF保存に失敗しました。時間をおいて再実行してください。',
      500,
      { detail: e?.message ?? String(e) }
    )
  }
}