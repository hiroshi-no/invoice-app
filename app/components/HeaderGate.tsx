'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import AppHeader from './AppHeader'

export default function HeaderGate() {
  const pathname = usePathname()
  const router = useRouter()
  const [err, setErr] = useState<string | null>(null)

  const isPublicPage = useMemo(() => {
    if (!pathname) return false

    return (
      pathname === '/login' ||
      pathname.startsWith('/login/') ||
      pathname === '/forgot-password' ||
      pathname.startsWith('/forgot-password/') ||
      pathname === '/update-password' ||
      pathname.startsWith('/update-password/') ||
      pathname === '/contact' ||
      pathname.startsWith('/contact/') ||
      pathname === '/privacy' ||
      pathname.startsWith('/privacy/') ||
      pathname === '/terms' ||
      pathname.startsWith('/terms/') ||
      pathname === '/legal' ||
      pathname.startsWith('/legal/')
    )
  }, [pathname])

  useEffect(() => {
    if (isPublicPage) return

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
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isPublicPage, router])

  if (isPublicPage) return null

  return (
    <>
      <AppHeader />
      {err ? <div className="px-4 py-2 text-xs text-red-600">{err}</div> : null}
    </>
  )
}