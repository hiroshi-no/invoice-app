export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

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

export async function GET(req: NextRequest) {
  const { supabase, cookiesToSet } = createSupabase(req)

  const json = (body: any, init?: ResponseInit) => {
    const res = NextResponse.json(body, init)
    for (const c of cookiesToSet) res.cookies.set(c.name, c.value, c.options)
    return res
  }

  // auth
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) return json({ error: userErr?.message ?? 'Not authenticated' }, { status: 401 })

  const u = new URL(req.url)
  const year = Number(u.searchParams.get('year') ?? new Date().getFullYear())
  if (!Number.isFinite(year) || year < 2000 || year > 2100) {
    return json({ error: 'Invalid year' }, { status: 400 })
  }

  const p_from = `${year}-01-01`
  const p_to = `${year + 1}-01-01`

  const { data, error } = await supabase.rpc('get_monthly_totals', {
    p_from,
    p_to,
    p_tz: 'Asia/Tokyo',
  })

  if (error) return json({ error: 'rpc failed: ' + error.message }, { status: 500 })

  return json({ ok: true, year, from: p_from, to: p_to, rows: data ?? [] }, { status: 200 })
}
