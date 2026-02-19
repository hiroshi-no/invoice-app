export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

function createSupabaseFromReq(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
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
  const s = String(v ?? '')
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export async function GET(req: NextRequest) {
  const { supabase, cookiesToSet } = createSupabaseFromReq(req)

  const withCookies = (res: NextResponse) => {
    for (const c of cookiesToSet) res.cookies.set(c.name, c.value, c.options)
    return res
  }

  // auth
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) {
    return withCookies(NextResponse.json({ error: userErr?.message ?? 'Not authenticated' }, { status: 401 }))
  }

  // year param
  const spYear = req.nextUrl.searchParams.get('year')
  const nowYear = Number(
   new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric' })
     .format(new Date())
 )
  const year = Number(spYear ?? nowYear)
  if (!Number.isFinite(year) || year < 2000 || year > 2100) {
    return withCookies(NextResponse.json({ error: 'Invalid year' }, { status: 400 }))
  }

  const from = `${year}-01-01`
  const to = `${year + 1}-01-01`

  const { data, error } = await supabase.rpc('get_monthly_totals', {
    p_from: from,
    p_to: to,
    p_tz: 'Asia/Tokyo',
  })

  if (error) {
    return withCookies(NextResponse.json({ error: error.message }, { status: 500 }))
  }

  const rows = (data ?? []) as Array<any>

  const header = ['month', 'currency', 'docs_count', 'subtotal_amount', 'tax_amount', 'total_amount']
  const lines = [
    header.join(','),
    ...rows.map((r) =>
      [
        csvEscape(String(r.month ?? '').slice(0, 10)),
        csvEscape(r.currency),
        csvEscape(r.docs_count),
        csvEscape(r.subtotal_amount),
        csvEscape(r.tax_amount),
        csvEscape(r.total_amount),
      ].join(',')
    ),
  ]

  // Excel向けにBOM付きUTF-8が無難
  const csv = '\uFEFF' + lines.join('\n')

  const filename = `monthly-${year}.csv`
  const res = new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })

  return withCookies(res)
}
