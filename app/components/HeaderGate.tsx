'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import AppHeader from './AppHeader'

type HeaderGateProps = {
  children: React.ReactNode
}

type GateState = 'loading' | 'ready' | 'error'

export default function HeaderGate({ children }: HeaderGateProps) {
  const pathname = usePathname()
  const router = useRouter()

  const [state, setState] = useState<GateState>('loading')
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    ;(async () => {
      try {
        setErr(null)

        const res = await fetch('/api/me/ensure-profile', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'content-type': 'application/json',
          },
          cache: 'no-store',
          signal: controller.signal,
        })

        const json = await res.json().catch(() => ({}))

        if (cancelled) return

        if (res.ok) {
          setState('ready')
          return
        }

        if (res.status === 401) {
          const next = pathname ? `?next=${encodeURIComponent(pathname)}` : ''
          router.replace(`/login${next}`)
          return
        }

        const message = `ensure-profile failed: HTTP ${res.status} ${json?.message ?? json?.error ?? ''}`
        setErr(message)
        setState((prev) => (prev === 'ready' ? 'ready' : 'error'))
      } catch (e: any) {
        if (cancelled) return

        const message =
          e?.name === 'AbortError'
            ? '読み込みがタイムアウトしました。再度お試しください。'
            : `ensure-profile failed: ${e?.message ?? String(e)}`

        setErr(message)
        setState((prev) => (prev === 'ready' ? 'ready' : 'error'))
      } finally {
        clearTimeout(timeoutId)
      }
    })()

    return () => {
      cancelled = true
      controller.abort()
      clearTimeout(timeoutId)
    }
  }, [pathname, router])

  if (state === 'loading') {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#f9fafb',
          color: '#111827',
        }}
      >
        <div
          style={{
            maxWidth: 1120,
            margin: '0 auto',
            padding: '24px 16px',
            fontSize: 14,
            color: '#6b7280',
          }}
        >
          読み込み中です…
        </div>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#f9fafb',
          color: '#111827',
        }}
      >
        <div
          style={{
            maxWidth: 1120,
            margin: '0 auto',
            padding: '24px 16px',
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8 }}>
            画面の読み込みに失敗しました
          </div>
          <div style={{ fontSize: 14, color: '#b91c1c' }}>
            {err ?? '時間をおいて再度お試しください。'}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#f9fafb',
        color: '#111827',
      }}
    >
      <AppHeader />

      <div
     style={{
       maxWidth: 1120,
       margin: '0 auto',
       width: '100%',
       padding: '16px 16px 0',
     }}
   >
     {err ? <div className="mt-2 text-xs text-red-600">{err}</div> : null}
   </div>

      <main
        style={{
          flex: 1,
          maxWidth: 1120,
          width: '100%',
          margin: '0 auto',
          padding: '16px',
        }}
      >
        {children}
      </main>
    </div>
  )
}