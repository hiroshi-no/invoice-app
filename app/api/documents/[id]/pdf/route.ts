// app/api/documents/[id]/pdf/route.ts
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { calcTotals } from '@/lib/calc'
import { loadOrgBranding } from '@/lib/pdf/branding'
import { buildInvoiceHtml } from '@/lib/pdf/buildInvoiceHtml'
import { renderPdfFromHtml } from '@/lib/pdf/render'
import { enforceRateLimit } from '@/lib/rateLimit'
import { Buffer } from 'node:buffer'

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

   const withCookies = (res: NextResponse) => {
     for (const c of cookiesToSet) res.cookies.set(c.name, c.value, c.options)
     res.headers.set('Cache-Control', 'no-store')
     return res
   }

  const respondErr = (body: any, status = 500) => {
    const res = NextResponse.json(body, { status })
    for (const c of cookiesToSet) res.cookies.set(c.name, c.value, c.options)
    return res
  }

const respondPdf = (pdf: Uint8Array) => {
  const body = Buffer.from(pdf) // ✅ Uint8Array -> Buffer(=BodyInit扱い)
  const res = new NextResponse(body, {
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

  if (!UUID_RE.test(documentId)) {
    return respondErr({ error: 'Invalid document id' }, 400)
  }

  // auth
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) {
    return respondErr({ error: userErr?.message ?? 'Not authenticated' }, 401)
  }

  // rate limit
  const limited = await enforceRateLimit(supabase, 'pdf_preview', 2, 60)
  if (limited) return withCookies(limited as NextResponse)

  // documents（RLSで見えない場合も 404 にしたい → maybeSingle で 0件を null 扱いにする）
  const { data: doc, error: docErr } = await supabase
    .from('documents')
    .select('id, org_id, customer_id, status, currency, document_no, issued_at')
    .eq('id', documentId)
    .maybeSingle()

  if (docErr) return respondErr({ error: docErr.message }, 500)
  if (!doc) return respondErr({ error: 'Document not found' }, 404)

  // ✅ orgId を確定（branding / items / customer などで使う）
  const orgId = String((doc as any).org_id ?? '')
  if (!UUID_RE.test(orgId)) return respondErr({ error: 'Document org_id not found' }, 500)

  // ✅ branding（org共通 user_settings）
  const branding = await loadOrgBranding(supabase as any, orgId)

  // customer（任意：見えない/無いなら空のまま）
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

  // items
  const { data: items, error: itemsErr } = await supabase
    .from('document_items')
    .select('position, description, quantity, unit_price_amount, line_subtotal_amount')
    .eq('document_id', documentId)
    .eq('org_id', orgId)
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
      message: e?.message ?? String(e),
    },
    500
  )
}
}