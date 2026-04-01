'use client'

import './globals.css'
import Link from 'next/link'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[app/global-error.tsx]', error)
  }, [error])

  return (
    <html lang="ja">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          background: '#fff',
          color: '#111827',
          fontFamily:
            'var(--font-geist-sans), system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
        }}
      >
        <main
          style={{
            minHeight: '100vh',
            display: 'grid',
            placeItems: 'center',
            padding: '40px 16px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 720,
              border: '1px solid #fecaca',
              borderRadius: 16,
              padding: 32,
              boxShadow: '0 8px 30px rgba(0,0,0,0.04)',
              background: '#fff',
            }}
          >
            <div
              style={{
                display: 'inline-block',
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 0.6,
                color: '#991b1b',
                background: '#fef2f2',
                borderRadius: 999,
                padding: '6px 10px',
                marginBottom: 16,
              }}
            >
              GLOBAL ERROR
            </div>

            <h1 style={{ fontSize: 32, lineHeight: 1.3, fontWeight: 700, margin: 0 }}>
              ページの表示に失敗しました
            </h1>

            <p style={{ marginTop: 16, color: '#4b5563', lineHeight: 1.8 }}>
              アプリ全体の表示中に問題が発生しました。時間をおいて再読み込みするか、
              改善しない場合はお問い合わせください。
            </p>

            {error?.digest ? (
              <p
                style={{
                  marginTop: 12,
                  fontSize: 13,
                  color: '#6b7280',
                  wordBreak: 'break-all',
                }}
              >
                エラー識別子: {error.digest}
              </p>
            ) : null}

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 12,
                marginTop: 24,
              }}
            >
              <button
                type="button"
                onClick={() => reset()}
                style={{
                  background: '#111827',
                  color: '#fff',
                  border: 'none',
                  padding: '12px 16px',
                  borderRadius: 10,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                再読み込みする
              </button>

              <Link
                href="/"
                style={{
                  display: 'inline-block',
                  textDecoration: 'none',
                  background: '#fff',
                  color: '#111827',
                  padding: '12px 16px',
                  borderRadius: 10,
                  fontWeight: 600,
                  border: '1px solid #d1d5db',
                }}
              >
                トップへ戻る
              </Link>

              <Link
                href="/contact"
                style={{
                  display: 'inline-block',
                  textDecoration: 'none',
                  background: '#fff',
                  color: '#111827',
                  padding: '12px 16px',
                  borderRadius: 10,
                  fontWeight: 600,
                  border: '1px solid #d1d5db',
                }}
              >
                お問い合わせ
              </Link>
            </div>
          </div>
        </main>
      </body>
    </html>
  )
}