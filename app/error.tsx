'use client'

import Link from 'next/link'
import { useEffect } from 'react'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[app/error.tsx]', error)
  }, [error])

  return (
    <main
      style={{
        minHeight: 'calc(100vh - 160px)',
        display: 'grid',
        placeItems: 'center',
        padding: '40px 16px',
        background: '#fff',
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
          ERROR
        </div>

        <h1 style={{ fontSize: 32, lineHeight: 1.3, fontWeight: 700, margin: 0 }}>
          エラーが発生しました
        </h1>

        <p style={{ marginTop: 16, color: '#4b5563', lineHeight: 1.8 }}>
          一時的な問題の可能性があります。もう一度お試しください。
          改善しない場合は、時間をおいて再度アクセスするか、お問い合わせからご連絡ください。
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
            href="/documents"
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
            書類一覧へ
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
  )
}