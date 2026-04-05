import Link from 'next/link'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import BillingSettingsClient from './ui'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Props = {
  searchParams?: Promise<{ checkout?: string }> | { checkout?: string }
}

async function getCookieStore() {
  const c: any = cookies()
  return typeof c?.then === 'function' ? await c : c
}

async function createSupabase() {
  const cookieStore = await getCookieStore()

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll().map((c: any) => ({
          name: c.name,
          value: c.value,
        }))
      },
      setAll() {
        // read only
      },
    },
  })
}

export default async function BillingSettingsPage({ searchParams }: Props) {
  const supabase = await createSupabase()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return (
      <div style={{ maxWidth: 980, margin: '40px auto', fontFamily: 'sans-serif' }}>
        <h1>料金プラン</h1>
        <p>
          ログインが必要です。<Link href="/login">ログインへ</Link>
        </p>
      </div>
    )
  }

  const sp = searchParams ? ('then' in searchParams ? await searchParams : searchParams) : {}
  const checkoutStatus = String((sp as any)?.checkout ?? '').trim()

  return (
    <div style={{ maxWidth: 980, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h1 style={{ margin: 0 }}>料金プラン</h1>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link href="/documents">書類一覧</Link>
          <Link href="/settings/branding">ブランド設定</Link>
        </div>
      </div>

      <p style={{ color: '#666', marginTop: 12 }}>
        現在のプラン確認と、Starter / Standard へのアップグレードができます。
      </p>

      <BillingSettingsClient checkoutStatus={checkoutStatus} />
    </div>
  )
}