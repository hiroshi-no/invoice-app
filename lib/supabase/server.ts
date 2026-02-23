import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const devLog = (...args: any[]) => {
  if (process.env.NODE_ENV !== 'production') console.log(...args)
}

export async function createClient() {
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

  devLog('SUPABASE_URL=', url)
  devLog('SUPABASE_KEY_PREFIX=', key.slice(0, 20))

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }: any) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // noop
        }
      },
    },
  })
}