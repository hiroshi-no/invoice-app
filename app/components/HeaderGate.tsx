'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import AppHeader from './AppHeader'

export default function HeaderGate() {
  const pathname = usePathname()
  const router = useRouter()
  const [err, setErr] = useState<string | null>(null)

  const isLogin = pathname === '/login' || pathname.startsWith('/login/')

  useEffect(() => {
    if (isLogin) return

    let cancelled = false
    ;(async () => {
      setErr(null)

      const res = await fetch('/api/me/ensure-profile', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
      })

      const json = await res.json().catch(() => ({}))

      if (cancelled) return

      if (!res.ok) {
        if (res.status === 401) {
          router.replace('/login')
          return
        }
        setErr(`ensure-profile failed: HTTP ${res.status} ${json?.message ?? json?.error ?? ''}`)
        return
      }

      // 確認用（必要なければ消してOK）
      console.log('ensure-profile ok', json)
    })()

    return () => {
      cancelled = true
    }
  }, [isLogin, router])

  if (isLogin) return null

  return (
    <>
      <AppHeader />
      {err ? <div className="px-4 py-2 text-xs text-red-600">{err}</div> : null}
    </>
  )
}