export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { calcTotals } from '@/lib/calc'

import { loadUserBranding } from '@/lib/pdf/branding'
import { buildInvoiceHtml } from '@/lib/pdf/buildInvoiceHtml'
import { renderPdfFromHtml } from '@/lib/pdf/render'

import { computeItemsHashFromDbRows, type DbItemRowForHash } from '@/lib/itemsHash'

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

  // 409ガード（未保存防止）
  const clientHash = (req.headers.get('x-items-hash') ?? '').trim().toLowerCase()
  if (!clientHash) {
    return respond({ error: 'Precondition required: x-items-hash' }, { status: 428 })
  }

  // documents（RLSで見えない＝404に寄せる）
  const { data: doc, error: docErr } = await supabase
    .from('documents')
    .select('id, customer_id, status, currency, document_no, issued_at')
    .eq('id', documentId)
    .single()

  if (docErr) {
    if ((docErr as any).code === 'PGRST116') return respond({ error: 'Document not found' }, { status: 404 })
    return respond({ error: docErr.message }, { status: 500 })
  }
  if (!doc) return respond({ error: 'Document not found' }, { status: 404 })

  // draft / issued のみ許可（必要に応じて調整）
  if (doc.status !== 'draft' && doc.status !== 'issued') {
    return respond({ error: 'invalid document status' }, { status: 409 })
  }

  // items（このあと rows と hash に使い回す）
  const { data: items, error: itemsErr } = await supabase
    .from('document_items')
    .select('id, position, description, quantity, unit_price_amount, line_subtotal_amount')
    .eq('document_id', documentId)
    .order('position', { ascending: true })

  if (itemsErr) return respond({ error: itemsErr.message }, { status: 500 })

  const dbHash = computeItemsHashFromDbRows((items ?? []) as DbItemRowForHash[]).toLowerCase()
  if (clientHash !== dbHash) {
    return respond(
      {
        error: 'items_not_saved',
        message:
          '明細が未保存（またはDBと不一致）のためPDF保存できません。編集画面で保存してから再実行してください。',
        expected: dbHash, // 本番は消してOK
        got: clientHash,  // 本番は消してOK
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

  // branding（個人専用 user_settings → service role download は lib 側）
  const branding = await loadUserBranding(supabase as any, userId)

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

  // 保存先（ファイル名は念のため安全化）
  const baseNo = String(doc.document_no ?? doc.id).trim()
  const safeNo = baseNo.replace(/[\\/:*?"<>|]/g, '_') // Windows禁則などを潰す
  const pdfFileName = `${safeNo}.pdf`
  const storagePath = `${userId}/${documentId}/${Date.now()}_${pdfFileName}`

  // ✅ Storageはadminでアップロード（RLSに左右されない）
  const admin = createSupabaseAdmin()

  const { data: up, error: upErr } = await admin.storage.from('documents').upload(storagePath, pdf, {
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
      document_id: documentId,
      path: storagePath, // ←あなたのschemaは path
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

  if (updErr) {
    return respond(
      { ok: true, file: saved, totals, warning: 'documents totals update failed: ' + updErr.message },
      { status: 200 }
    )
  }

  return respond({ ok: true, file: saved, totals }, { status: 200 })

}
