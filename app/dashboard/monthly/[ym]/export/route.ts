export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

import { createSupabaseServerClient } from '@/lib/api/supabase-server'
import { withDebug } from '@/lib/debug'
import { requireCurrentOrgId } from '@/lib/org/getCurrentOrgId'

type RouteContext = { params: { ym: string } | Promise<{ ym: string }> }

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

function csvEscape(v: any) {
  const s = v == null ? '' : String(v)
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function formatDateJst(v: any) {
  if (!v) return ''
  return new Date(v).toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  try {
    const params = 'then' in (ctx.params as any) ? await (ctx.params as any) : (ctx.params as any)
    const ym = String(params?.ym ?? '')

    const { supabase, cookiesToSet } = createSupabaseServerClient(req)

    const json = (body: any, init?: ResponseInit) => {
      const res = NextResponse.json(body, init)
      for (const c of cookiesToSet) res.cookies.set(c.name, c.value, c.options)
      res.headers.set('Cache-Control', 'no-store')
      return res
    }

    if (!isYm(ym)) {
      return json(
        { error: 'invalid_ym', message: '年月の指定が不正です。', ym },
        { status: 400 }
      )
    }

    const current = await requireCurrentOrgId(supabase as any)
    if (!current.ok) {
      const { detail, ...safeBody } = current.body
      return json(
        {
          ...safeBody,
          ...withDebug(detail ? { detail } : {}),
        },
        { status: current.status }
      )
    }

    const { orgId } = current

    const from = `${ym}-01T00:00:00+09:00`
    const to = `${nextYm(ym)}-01T00:00:00+09:00`

    const { data: docs, error: docErr } = await supabase
      .from('documents')
      .select('id, document_no, issued_at, currency, subtotal_amount, tax_amount, total_amount, customer_id')
      .eq('org_id', orgId)
      .eq('status', 'issued')
      .gte('issued_at', from)
      .lt('issued_at', to)
      .order('issued_at', { ascending: false })

    if (docErr) {
      return json(
        {
          error: 'documents_fetch_failed',
          message: '月別明細の取得に失敗しました。時間をおいて再実行してください。',
          ...withDebug({ detail: docErr.message, orgId, ym }),
        },
        { status: 500 }
      )
    }

    const list = (docs ?? []) as any[]

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

      if (cusErr) {
        return json(
          {
            error: 'customers_fetch_failed',
            message: '顧客情報の取得に失敗しました。時間をおいて再実行してください。',
            ...withDebug({ detail: cusErr.message, orgId, ym }),
          },
          { status: 500 }
        )
      }

      for (const c of customers ?? []) {
        customerNameById.set(String((c as any).id), String((c as any).name ?? ''))
      }
    }

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
    return NextResponse.json(
      {
        error: 'monthly_export_failed',
        message: 'CSVエクスポートに失敗しました。時間をおいて再実行してください。',
        ...withDebug({ detail: e?.message ?? 'Internal Server Error' }),
      },
      { status: 500 }
    )
  }
}