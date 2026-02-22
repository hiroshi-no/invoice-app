// app/api/documents/[id]/pdf/route.ts
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { calcTotals } from '@/lib/calc'
import { loadUserBranding } from '@/lib/pdf/branding'
import { buildInvoiceHtml } from '@/lib/pdf/buildInvoiceHtml'
import { renderPdfFromHtml } from '@/lib/pdf/render'

type RouteContext = { params: { id: string } } | { params: Promise<{ id: string }> }

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

export async function GET(req: NextRequest, ctx: RouteContext) {
  const params = await Promise.resolve((ctx as any).params)
  const documentId = String((params as any).id ?? '')

  const { supabase, cookiesToSet } = createSupabase(req)

const respondPdf = (pdf: Uint8Array) => {
  const ab = new ArrayBuffer(pdf.byteLength)
  const view = new Uint8Array(ab)
  view.set(pdf)

  const res = new NextResponse(view, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="invoice-${documentId}.pdf"`,
      'Cache-Control': 'no-store',
    },
  })
  for (const c of cookiesToSet) res.cookies.set(c.name, c.value, c.options)
  return res
}

  const respondErr = (body: any, status = 500) => {
    const res = NextResponse.json(body, { status })
    for (const c of cookiesToSet) res.cookies.set(c.name, c.value, c.options)
    return res
  }

  if (!UUID_RE.test(documentId)) {
    return respondErr({ error: 'Invalid document id' }, 400)
  }

  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) {
    return respondErr({ error: userErr?.message ?? 'Not authenticated' }, 401)
  }
  const userId = userData.user.id

  // documents（RLSで見えない場合も 404 にしたい）
  const { data: doc, error: docErr } = await supabase
    .from('documents')
    .select('id, customer_id, status, currency, document_no, issued_at')
    .eq('id', documentId)
    .single()

  if (docErr) {
    // ✅ 0件（RLSで見えない/存在しない）を 404 に寄せる
    if ((docErr as any).code === 'PGRST116') return respondErr({ error: 'Document not found' }, 404)
    return respondErr({ error: docErr.message }, 500)
  }
  if (!doc) return respondErr({ error: 'Document not found' }, 404)

  // branding（個人専用 user_settings）
  const branding = await loadUserBranding(supabase, userId)

  // customer（任意：見えない/無いなら空のまま）
  let customerName = ''
  if (doc.customer_id) {
    const { data: customer, error: cErr } = await supabase
      .from('customers')
      .select('name')
      .eq('id', doc.customer_id)
      .maybeSingle()

    if (!cErr) customerName = String((customer as any)?.name ?? '')
  }

  // items
  const { data: items, error: itemsErr } = await supabase
    .from('document_items')
    .select('position, description, quantity, unit_price_amount, line_subtotal_amount')
    .eq('document_id', documentId)
    .order('position', { ascending: true })

  if (itemsErr) return respondErr({ error: itemsErr.message }, 500)

  // pdf/save と同じ計算（line_subtotal_amount を優先、なければ qty*unit）
 const rows = (items ?? []).map((it: any) => {
   const qty = num(it.quantity)
   const unit = num(it.unit_price_amount)

   const dbLineRaw = it.line_subtotal_amount
   const line = dbLineRaw == null ? qty * unit : num(dbLineRaw)

   return { description: it.description ?? '', qty, unit, line }
 })


  const subtotal = rows.reduce((a, r) => a + num(r.line), 0)
  const currency = String(doc.currency ?? 'JPY')
  const totals = calcTotals(subtotal, currency)

  const html = buildInvoiceHtml({
    title: 'INVOICE',
    documentNo: String(doc.document_no ?? doc.id),
    issuedAt: String(doc.issued_at ?? ''),
    customerName,
    currency,
    rows,
    totals,
    branding,
  })

  const pdf = await renderPdfFromHtml(html)
  return respondPdf(pdf)
}
