import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) {
    // 環境変数がないなら何もしない（開発時に気づけるようにしてもOK）
    return NextResponse.next()
  }

  // 上流へ渡すレスポンス（このレスポンスにSet-Cookieを積む）
  const response = NextResponse.next({
    request: {
      headers: new Headers(request.headers),
    },
  })

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        // 同一リクエスト内でServer Componentsにも新Cookieを見せる
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value) // request側 :contentReference[oaicite:4]{index=4}
          response.cookies.set({ name, value, ...options }) // response側 :contentReference[oaicite:5]{index=5}
        })
      },
    },
  })

  // 期限切れの更新 + JWT検証（Supabaseはこれを推奨）
  // Server側でgetSession()を信頼して保護しないよう注意、という趣旨も公式に明記あり :contentReference[oaicite:6]{index=6}
  await supabase.auth.getClaims()

  return response
}
