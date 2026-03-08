export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getCurrentOrgId } from '@/lib/org/getCurrentOrgId'

type RouteContext = { params: { ym: string } | Promise<{ ym: string }> }

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isYm(v: string) {
  return /^\d{4}-\d{2}$/.test(v)
}

function nextYm(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1, 1))
  d.setUTCMonth(d.getUTCMonth() + 1)
  const yy = d.getUTCFullYear()
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${yy}-${mm}`
}

function createSupabaseFromReq(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
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

function csvEscape(v: any) {
  const s = v == null ? '' : String(v)
  // カンマ・改行・ダブルクォートがある場合は "..." で囲い、" は "" にする
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function formatDateJst(v: any) {
  if (!v) return ''
  // JSTで YYYY-MM-DD を出す（CSV用途）
  const s = new Date(v).toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' }) // => 2026-02-04
  return s
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  try {
    const params = 'then' in (ctx.params as any) ? await (ctx.params as any) : (ctx.params as any)
    const ym = String(params?.ym ?? '')

    const { supabase, cookiesToSet } = createSupabaseFromReq(req)

    const json = (body: any, init?: ResponseInit) => {
      const res = NextResponse.json(body, init)
      for (const c of cookiesToSet) res.cookies.set(c.name, c.value, c.options)
      res.headers.set('Cache-Control', 'no-store')
      return res
    }

    if (!isYm(ym)) return json({ error: 'Invalid ym', ym }, { status: 400 })

    // auth
    const { data: userData, error: userErr } = await supabase.auth.getUser()
    if (userErr || !userData.user) return json({ error: userErr?.message ?? 'Not authenticated' }, { status: 401 })

    const userId = userData.user.id

    // ✅ current org を確定（profiles直読みは lib に集約）
    let orgId: string
    try {
      orgId = await getCurrentOrgId(supabase as any, userId)
      if (!UUID_RE.test(orgId)) throw new Error('current_org_id invalid')
    } catch (e: any) {
      return json({ error: e?.message ?? 'org not found' }, { status: 500 })
    }

    // issued_at が timestamptz（UTC保存）でも月境界がズレないように JST(+09:00) を明示
    const from = `${ym}-01T00:00:00+09:00`
    const to = `${nextYm(ym)}-01T00:00:00+09:00`

    // issued のみ（月内）+ orgで絞る
    const { data: docs, error: docErr } = await supabase
      .from('documents')
      .select('id, document_no, issued_at, currency, subtotal_amount, tax_amount, total_amount, customer_id')
      .eq('org_id', orgId)
      .eq('status', 'issued')
      .gte('issued_at', from)
      .lt('issued_at', to)
      .order('issued_at', { ascending: false })

    if (docErr) return json({ error: docErr.message }, { status: 500 })

    const list = (docs ?? []) as any[]

    // customers をまとめて取得（表示用）
    const customerIds = Array.from(
      new Set(list.map((d) => String(d.customer_id ?? '')).filter((x) => x && x !== 'null'))
    )

    const customerNameById = new Map<string, string>()
    if (customerIds.length > 0) {
      const { data: customers, error: cusErr } = await supabase
        .from('customers')
        .select('id, name')
        .in('id', customerIds)
        .eq('org_id', orgId)

      if (cusErr) return json({ error: 'customers load failed: ' + cusErr.message }, { status: 500 })

      for (const c of customers ?? []) {
        customerNameById.set(String((c as any).id), String((c as any).name ?? ''))
      }
    }

    // CSV組み立て
    const header = [
      'issued_at',
      'document_no',
      'customer_name',
      'currency',
      'subtotal_amount',
      'tax_amount',
      'total_amount',
      'document_id',
    ]

    const lines: string[] = []
    lines.push(header.join(','))

    for (const d of list) {
      const custId = String(d.customer_id ?? '')
      const custName = customerNameById.get(custId) ?? ''

      const row = [
        csvEscape(formatDateJst(d.issued_at)),
        csvEscape(String(d.document_no ?? '')),
        csvEscape(custName),
        csvEscape(String(d.currency ?? '')),
        csvEscape(Number(d.subtotal_amount ?? 0)),
        csvEscape(Number(d.tax_amount ?? 0)),
        csvEscape(Number(d.total_amount ?? 0)),
        csvEscape(String(d.id ?? '')),
      ]
      lines.push(row.join(','))
    }

    // Excel対策：UTF-8 BOM を付与
    const csv = '\uFEFF' + lines.join('\r\n')

    const res = new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="invoices-${ym}.csv"`,
        'Cache-Control': 'no-store',
      },
    })

    for (const c of cookiesToSet) res.cookies.set(c.name, c.value, c.options)
    return res
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Internal Server Error' }, { status: 500 })
  }
}