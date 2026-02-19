import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  // Next.js のバージョン差で cookies() が Promise のことがあるため async で扱う
  const cookieStore: any = await cookies()

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error(
      'Missing env vars: NEXT_PUBLIC_SUPABASE_URL and (NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY)'
    )
  }

  // 必要なら残す（動作確認できたら消してOK）
  console.log('SUPABASE_URL=', url)
  console.log('SUPABASE_KEY_PREFIX=', key.slice(0, 20))

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        // cookieStore.getAll() がある前提（Next 13/14/15 の通常形）
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }: any) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Server Component で set が禁止されるケース対策（noop）
        }
      },
    },
  })
}
