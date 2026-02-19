import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? ''

  return NextResponse.json({
    url,
    url_ok: /^https?:\/\//.test(url),
    key_prefix: key.slice(0, 20),
    key_len: key.length,
  })
}
