import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  /**
   * ✅ 公開（本番）では封印
   * - Vercel上では Preview/Production ともに NODE_ENV=production になることが多いので、
   *   「本番相当の環境では返さない」方針で強制的に 404 にします。
   */
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  // ※あなたの環境変数名に合わせてここはそのまま（必要なら ANON_KEY に直す）
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? ''

  return NextResponse.json({
    url,
    url_ok: /^https?:\/\//.test(url),
    key_prefix: key.slice(0, 20),
    key_len: key.length,
  })
}