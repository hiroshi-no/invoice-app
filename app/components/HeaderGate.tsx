'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import AppHeader from './AppHeader'

function matchPath(pathname: string, base: string) {
  return pathname === base || pathname.startsWith(`${base}/`)
}

export default function HeaderGate() {
  const pathname = usePathname()
  const router = useRouter()

  const [err, setErr] = useState<string | null>(null)
  const [showHeaderOnOptionalPage, setShowHeaderOnOptionalPage] = useState(false)

  const isAuthPage = useMemo(() => {
    if (!pathname) return false

    return (
      matchPath(pathname, '/login') ||
      matchPath(pathname, '/forgot-password') ||
      matchPath(pathname, '/update-password')
    )
  }, [pathname])

  const isAlwaysPublicPage = useMemo(() => {
    if (!pathname) return false

    return (
      matchPath(pathname, '/privacy') ||
      matchPath(pathname, '/terms') ||
      matchPath(pathname, '/legal')
    )
  }, [pathname])

  const isProtectedPage = useMemo(() => {
    if (!pathname) return false

    return (
      matchPath(pathname, '/documents') ||
      matchPath(pathname, '/customers') ||
      matchPath(pathname, '/user-settings') ||
      matchPath(pathname, '/dashboard')
      // ダッシュボードが "/" の場合は下を有効化
      // pathname === '/'
    )
  }, [pathname])

  const isOptionalHeaderPage = useMemo(() => {
    if (!pathname) return false
    return matchPath(pathname, '/contact')
  }, [pathname])

  useEffect(() => {
    setShowHeaderOnOptionalPage(false)

    if (!isProtectedPage && !isOptionalHeaderPage) return

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

      if (res.ok) {
        if (isOptionalHeaderPage) {
          setShowHeaderOnOptionalPage(true)
        }
        return
      }

      if (res.status === 401) {
        if (isProtectedPage) {
          router.replace('/login')
          return
        }

        // /contact などの公開ページでは、未ログインならヘッダーを出さないだけ
        setShowHeaderOnOptionalPage(false)
        return
      }

      setErr(`ensure-profile failed: HTTP ${res.status} ${json?.message ?? json?.error ?? ''}`)
    })()

    return () => {
      cancelled = true
    }
  }, [isProtectedPage, isOptionalHeaderPage, router])

  const shouldShowHeader =
    isProtectedPage || (isOptionalHeaderPage && showHeaderOnOptionalPage)

  if (isAuthPage || isAlwaysPublicPage) return null

  return (
    <>
      {shouldShowHeader ? <AppHeader /> : null}
      {err ? <div className="px-4 py-2 text-xs text-red-600">{err}</div> : null}
    </>
  )
}