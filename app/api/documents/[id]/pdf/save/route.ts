export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { Buffer } from 'node:buffer'

import { calcTotals } from '@/lib/calc'
import { withDebug } from '@/lib/debug'
import { computeItemsHashFromDbRows, type DbItemRowForHash } from '@/lib/itemsHash'
import { loadOrgBranding } from '@/lib/pdf/branding'
import { buildInvoiceHtml } from '@/lib/pdf/buildInvoiceHtml'
import { renderPdfFromHtml } from '@/lib/pdf/render'
import { enforceRateLimit } from '@/lib/rateLimit'

type RouteContext =
  | { params: { id: string } }
  | { params: Promise<{ id: string }> }

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, serviceKey, { auth: { persistSession: false } })
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

function num(v: any) {
  if (v == null) return 0
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const params = await Promise.resolve((ctx as any).params)
  const documentId = String((params as any).id ?? '')

  const { supabase, cookiesToSet } = createSupabase(req)

  const respond = (body: any, init?: ResponseInit) => {
    const res = NextResponse.json(body, init)
    for (const c of cookiesToSet) res.cookies.set(c.name, c.value, c.options)
    res.headers.set('Cache-Control', 'no-store')
    return res
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
    .select('id, org_id, customer_id, status, currency, document_no, issued_at')
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

  let customerName = ''
  if (doc.customer_id) {
    const { data: customer, error: cErr } = await supabase
      .from('customers')
      .select('name')
      .eq('id', doc.customer_id)
      .eq('org_id', orgId)
      .maybeSingle()

    if (!cErr) customerName = String((customer as any)?.name ?? '')
  }

  const rowsForPdf = (items ?? []).map((it: any) => {
    const qty = num(it.quantity)
    const unit = num(it.unit_price_amount)
    const dbLineRaw = it.line_subtotal_amount
    const line = dbLineRaw == null ? qty * unit : num(dbLineRaw)
    return { description: it.description ?? '', qty, unit, line }
  })

  const subtotal = rowsForPdf.reduce((a, r) => a + num(r.line), 0)
  const currency = String(doc.currency ?? 'JPY')
  const totals = calcTotals(subtotal, currency)

  const branding = await loadOrgBranding(supabase as any, orgId)

  const html = buildInvoiceHtml({
    title: 'INVOICE',
    documentNo: String(doc.document_no ?? doc.id),
    issuedAt: String(doc.issued_at ?? ''),
    customerName,
    currency,
    rows: rowsForPdf,
    totals,
    branding,
  })

  const admin = createSupabaseAdmin()

  try {
    const pdf = await renderPdfFromHtml(html)
    const pdfBuf = Buffer.isBuffer(pdf) ? pdf : Buffer.from(pdf as any)

    const baseNo = String(doc.document_no ?? doc.id).trim()
    const safeNo = baseNo.replace(/[\\/:*?"<>|]/g, '_')
    const pdfFileName = `${safeNo}.pdf`
    const storagePath = `${orgId}/${documentId}/${Date.now()}_${pdfFileName}`

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
        created_by: userId,
      })
      .select('id, created_at, path')
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
          warning: '合計金額の更新に一部失敗しました。',
          ...withDebug({ detail: updErr.message }),
        },
        { status: 200 }
      )
    }

    return respond({ ok: true, file: saved, totals }, { status: 200 })
  } catch (e: any) {
    return respondErr(
      'pdf_save_failed',
      'PDF保存に失敗しました。時間をおいて再実行してください。',
      500,
      { detail: e?.message ?? String(e) }
    )
  }
}