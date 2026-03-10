export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { createClient } from '@supabase/supabase-js'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { calcTotals } from '@/lib/calc'

import { loadOrgBranding } from '@/lib/pdf/branding'
import { buildInvoiceHtml } from '@/lib/pdf/buildInvoiceHtml'
import { renderPdfFromHtml } from '@/lib/pdf/render'
import { computeItemsHashFromDbRows, type DbItemRowForHash } from '@/lib/itemsHash'
import { enforceRateLimit } from '@/lib/rateLimit'
import { Buffer } from 'node:buffer'
import { withDebug } from '@/lib/debug'

function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, serviceKey, { auth: { persistSession: false } })
}

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
    return res
  }

  if (!UUID_RE.test(documentId)) {
    return respond({ error: 'Invalid document id' }, { status: 400 })
  }

const { data: userData, error: userErr } = await supabase.auth.getUser()
if (userErr || !userData.user) {
  return respond({ error: userErr?.message ?? 'Not authenticated' }, { status: 401 })
}
const userId = userData.user.id

  const isInternal = req.headers.get('x-internal-call') === '1'
    // ✅ ここに置く（テスト用ログ）
    if (process.env.NODE_ENV !== 'production') {
      console.log('[pdf/save] called. internal=', isInternal)
    }
  if (!isInternal) {
    const limited = await enforceRateLimit(supabase, 'pdf_save', 10, 60)
    if (limited) return limited
  }

  // 409/428 ガード（未保存防止）
  const clientHash = (req.headers.get('x-items-hash') ?? '').trim().toLowerCase()
  if (!clientHash) {
    return respond({ error: 'Precondition required: x-items-hash' }, { status: 428 })
  }

// documents（RLSで見えない＝404に寄せる）
const { data: doc, error: docErr } = await supabase
  .from('documents')
  .select('id, org_id, customer_id, status, currency, document_no, issued_at') // ✅ org_id を追加
  .eq('id', documentId)
  .maybeSingle()

if (docErr) return respond({ error: docErr.message }, { status: 500 })
if (!doc) return respond({ error: 'Document not found' }, { status: 404 })

// ✅ org_id 必須（document_files insert に使う）
    if (!doc.org_id) {
      return respond({ error: 'Document org_id not found' }, { status: 500 })
    }
    const orgId = doc.org_id as string

// draft / issued のみ許可（必要に応じて調整）
if (doc.status !== 'draft' && doc.status !== 'issued') {
  return respond({ error: 'invalid document status' }, { status: 409 })
}

  // items（このあと rows と hash に使い回す）
const { data: items, error: itemsErr } = await supabase
  .from('document_items')
  .select('id, position, description, quantity, unit_price_amount, line_subtotal_amount')
  .eq('document_id', documentId)
  .eq('org_id', orgId) // ✅ 追加
  .order('position', { ascending: true })
  .order('id', { ascending: true })

  if (itemsErr) return respond({ error: itemsErr.message }, { status: 500 })

const rowsForHash = (items ?? []).map((it: any) => ({
  position: Number(it.position ?? 0),
  description: it.description ?? null,
  quantity: Number(it.quantity ?? 0),
  unit_price_amount: Number(it.unit_price_amount ?? 0),
  line_subtotal_amount: it.line_subtotal_amount == null ? null : Number(it.line_subtotal_amount),
}))

const dbHash = computeItemsHashFromDbRows(rowsForHash as DbItemRowForHash[]).toLowerCase()

// ✅ 未保存ガード（x-items-hash）
if (clientHash !== dbHash) {
  return respond(
  {
    error: 'items_not_saved',
    message: '明細が未保存（またはDBと不一致）のため保存できません。編集画面で保存してから再実行してください。',
    ...withDebug({ expected: dbHash, got: clientHash }),
  },
  { status: 409 }
)
}

  // customer（無くてもPDF作る）
  let customerName = ''
  if (doc.customer_id) {
    const { data: customer, error: cErr } = await supabase
      .from('customers')
      .select('name')
      .eq('id', doc.customer_id)
      .eq('org_id', orgId) // ✅ 追加
      .maybeSingle()

    if (!cErr) customerName = String((customer as any)?.name ?? '')
  }

  // line_subtotal_amount を正とし、null のときだけ qty*unit へフォールバック
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

   // ✅ branding（org共通）
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

// preview と同じ画像待機（共通レンダラ）
const pdf = await renderPdfFromHtml(html)

// ★追加：バイト長を確実に取る
const pdfBuf = Buffer.isBuffer(pdf) ? pdf : Buffer.from(pdf as any)
const pdfSizeBytes = pdfBuf.length

  // 保存先（ファイル名は念のため安全化）
  const baseNo = String(doc.document_no ?? doc.id).trim()
  const safeNo = baseNo.replace(/[\\/:*?"<>|]/g, '_') // Windows禁則などを潰す
  const pdfFileName = `${safeNo}.pdf`
  const storagePath = `${orgId}/${documentId}/${Date.now()}_${pdfFileName}`

  // ✅ Storageはadminでアップロード（RLSに左右されない）
  const admin = createSupabaseAdmin()

  const { data: up, error: upErr } = await admin.storage.from('documents').upload(storagePath, pdfBuf, {
    contentType: 'application/pdf',
    upsert: false,
  })
  if (upErr || !up?.path) {
    return respond({ error: 'Storage upload failed: ' + (upErr?.message ?? 'unknown') }, { status: 500 })
  }

  // ✅ すぐ存在確認（実体なし問題を確実に検出）
  const { data: signedCheck, error: signedErr } = await admin.storage
    .from('documents')
    .createSignedUrl(storagePath, 60)

  if (signedErr || !signedCheck?.signedUrl) {
    // best effort cleanup
    try {
      await admin.storage.from('documents').remove([storagePath])
    } catch {}
    return respond({ error: 'Storage verify failed: ' + (signedErr?.message ?? 'no signedUrl') }, { status: 500 })
  }

// ✅ document_files に保存（ここはRLSで自分の行だけ入る想定）
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
    // insert失敗ならアップロード済みファイルを掃除（孤児防止）
    try {
      await admin.storage.from('documents').remove([storagePath])
    } catch {}
    return respond({ error: 'DB insert failed: ' + (insErr?.message ?? 'missing id') }, { status: 500 })
  }

  // totals 更新（失敗してもファイル保存は成立）
  const { error: updErr } = await supabase
    .from('documents')
    .update({ subtotal_amount: totals.subtotal, tax_amount: totals.tax, total_amount: totals.total })
    .eq('id', documentId)
    .eq('org_id', orgId) // ✅ 追加

  if (updErr) {
    return respond(
      { ok: true, file: saved, totals, warning: 'documents totals update failed: ' + updErr.message },
      { status: 200 }
    )
  }

  return respond({ ok: true, file: saved, totals }, { status: 200 })

}
