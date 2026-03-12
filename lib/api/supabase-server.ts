// lib/api/supabase-server.ts
import { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export type CookieToSet = {
  name: string
  value: string
  options?: any
}

export function createSupabaseServerClient(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error('Missing Supabase env vars')
  }

  const cookiesToSet: CookieToSet[] = []

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll().map((c) => ({
          name: c.name,
          value: c.value,
        }))
      },
      setAll(list) {
        cookiesToSet.push(...list)
      },
    },
  })

  return { supabase, cookiesToSet }
}