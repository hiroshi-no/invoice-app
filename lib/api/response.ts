// lib/api/response.ts
import { NextResponse } from 'next/server'
import type { CookieToSet } from '@/lib/api/supabase-server'

export function applyCookies(
  res: NextResponse,
  cookiesToSet: CookieToSet[],
  options?: {
    noStore?: boolean
  }
) {
  for (const c of cookiesToSet) {
    res.cookies.set(c.name, c.value, c.options)
  }

  if (options?.noStore !== false) {
    res.headers.set('Cache-Control', 'no-store')
  }

  return res
}

export function respondJson(
  cookiesToSet: CookieToSet[],
  body: any,
  init?: ResponseInit,
  options?: {
    noStore?: boolean
  }
) {
  const res = NextResponse.json(body, init)
  return applyCookies(res, cookiesToSet, options)
}