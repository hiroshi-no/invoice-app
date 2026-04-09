import { NextRequest, NextResponse } from 'next/server'
import { getAdminContextFromRequest } from '@/lib/authz/getAdminContextFromRequest'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function applyCookies(
  res: NextResponse,
  cookiesToSet: Array<{ name: string; value: string; options?: any }>
) {
  for (const c of cookiesToSet) {
    res.cookies.set(c.name, c.value, c.options)
  }
  return res
}

export async function GET(req: NextRequest) {
  const ctx = await getAdminContextFromRequest(req)

  if (!ctx.ok) {
    const res = NextResponse.json(
      { ok: false, error: ctx.reason },
      { status: 403 }
    )
    return applyCookies(res, ctx.cookiesToSet)
  }

  const res = NextResponse.json({
    ok: true,
    orgId: ctx.orgId,
    role: ctx.role,
    email: ctx.user.email ?? null,
  })

  return applyCookies(res, ctx.cookiesToSet)
}