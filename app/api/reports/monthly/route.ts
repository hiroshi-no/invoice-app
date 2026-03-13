export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'

import { respondJson } from '@/lib/api/response'
import { createSupabaseServerClient } from '@/lib/api/supabase-server'
import { withDebug } from '@/lib/debug'
import { requireCurrentOrgId } from '@/lib/org/getCurrentOrgId'

export async function GET(req: NextRequest) {
  const { supabase, cookiesToSet } = createSupabaseServerClient(req)

  const json = (body: any, init?: ResponseInit) => {
    return respondJson(cookiesToSet, body, init)
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

  const u = new URL(req.url)
  const year = Number(u.searchParams.get('year') ?? new Date().getFullYear())

  if (!Number.isFinite(year) || year < 2000 || year > 2100) {
    return json(
      { error: 'invalid_year', message: '年の指定が不正です。' },
      { status: 400 }
    )
  }

  const p_from = `${year}-01-01`
  const p_to = `${year + 1}-01-01`

  const { data, error } = await supabase.rpc('get_monthly_totals', {
    p_from,
    p_to,
    p_tz: 'Asia/Tokyo',
    // RPC 側が org_id 対応済みならこれを有効化
    // p_org_id: orgId,
  })

  if (error) {
    return json(
      {
        error: 'monthly_report_failed',
        message: '月次集計の取得に失敗しました。時間をおいて再実行してください。',
        ...withDebug({
          detail: error.message,
          orgId,
        }),
      },
      { status: 500 }
    )
  }

  return json(
    {
      ok: true,
      year,
      from: p_from,
      to: p_to,
      rows: data ?? [],
    },
    { status: 200 }
  )
}