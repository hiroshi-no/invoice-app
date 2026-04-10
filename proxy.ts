import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// /admin を許可するホスト
// 本番は seikyunote.com のみ
// ローカル確認用に localhost も許可
const ALLOWED_ADMIN_HOSTS = new Set([
  'seikyunote.com',
  'localhost:3000',
  '127.0.0.1:3000',
])

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const host = request.headers.get('host') || ''

  // /admin と /api/admin は許可ホストからしか開けない
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    if (!ALLOWED_ADMIN_HOSTS.has(host)) {
      return new NextResponse('Not Found', { status: 404 })
    }
  }

  // ここから先は既存の Supabase セッション維持処理
  const response = NextResponse.next()

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!url || !key) return response

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value)
          response.cookies.set({ name, value, ...options })
        })
      },
    },
  })

  await supabase.auth.getClaims()

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}