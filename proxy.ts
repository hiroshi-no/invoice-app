import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// admin画面を許可するホスト
// 本番は admin.seikyunote.com のみ
// ローカル確認用に localhost も許可
const ALLOWED_ADMIN_HOSTS = new Set([
  'admin.seikyunote.com',
  'localhost:3000',
  '127.0.0.1:3000',
])

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const host = request.headers.get('host') || ''

  // /admin と /api/admin は admin 用ホストからしか開けないようにする
  // 例:
  // - admin.seikyunote.com/admin -> 通す
  // - seikyunote.com/admin -> 404
  // - admin.seikyunote.com/api/admin/ping -> 通す
  // - seikyunote.com/api/admin/ping -> 404
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    if (!ALLOWED_ADMIN_HOSTS.has(host)) {
      return new NextResponse('Not Found', { status: 404 })
    }
  }

  // ここから先は、既存の Supabase セッション維持処理
  const response = NextResponse.next()

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  // 環境変数が未設定なら、そのまま通す
  if (!url || !key) return response

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          // request 側にも反映
          request.cookies.set(name, value)

          // response 側にも反映
          response.cookies.set({ name, value, ...options })
        })
      },
    },
  })

  // セッション更新・claims 取得
  await supabase.auth.getClaims()

  return response
}

export const config = {
  matcher: [
    // 既存の全体マッチャーを維持
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}