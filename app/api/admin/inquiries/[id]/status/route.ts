import { NextRequest, NextResponse } from 'next/server'
import { getAdminContextFromRequest } from '@/lib/authz/getAdminContextFromRequest'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALLOWED_STATUS = new Set(['new', 'in_progress', 'done'])

type Props = {
  params:
    | Promise<{ id: string }>
    | {
        id: string
      }
}

function applyCookies(
  res: NextResponse,
  cookiesToSet: Array<{ name: string; value: string; options?: any }>
) {
  for (const c of cookiesToSet) {
    res.cookies.set(c.name, c.value, c.options)
  }
  return res
}

export async function PATCH(req: NextRequest, { params }: Props) {
  const ctx = await getAdminContextFromRequest(req)

  if (!ctx.ok) {
    const res = NextResponse.json(
      { ok: false, error: ctx.reason },
      { status: 403 }
    )
    return applyCookies(res, ctx.cookiesToSet)
  }

  const resolvedParams =
    params && typeof (params as any)?.then === 'function'
      ? await (params as Promise<{ id: string }>)
      : params

  const id = String(resolvedParams.id ?? '').trim()

  if (!id) {
    const res = NextResponse.json(
      { ok: false, error: 'invalid_id' },
      { status: 400 }
    )
    return applyCookies(res, ctx.cookiesToSet)
  }

  let body: any = null

  try {
    body = await req.json()
  } catch {
    const res = NextResponse.json(
      { ok: false, error: 'invalid_json' },
      { status: 400 }
    )
    return applyCookies(res, ctx.cookiesToSet)
  }

  const status = String(body?.status ?? '').trim()

  if (!ALLOWED_STATUS.has(status)) {
    const res = NextResponse.json(
      { ok: false, error: 'invalid_status' },
      { status: 400 }
    )
    return applyCookies(res, ctx.cookiesToSet)
  }

  const { data, error } = await ctx.supabase
    .from('contact_messages')
    .update({ status })
    .eq('id', id)
    .select('id, status')
    .maybeSingle()

  if (error) {
    const res = NextResponse.json(
      { ok: false, error: 'update_failed', detail: error.message },
      { status: 500 }
    )
    return applyCookies(res, ctx.cookiesToSet)
  }

  if (!data) {
    const res = NextResponse.json(
      { ok: false, error: 'not_found' },
      { status: 404 }
    )
    return applyCookies(res, ctx.cookiesToSet)
  }

  const res = NextResponse.json({
    ok: true,
    inquiry: data,
  })

  return applyCookies(res, ctx.cookiesToSet)
}