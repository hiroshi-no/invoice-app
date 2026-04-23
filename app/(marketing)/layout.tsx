import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import MarketingHeader from '@/app/components/MarketingHeader'

export const metadata: Metadata = {
  robots: {
    index: true,
    follow: true,
  },
}

export default function MarketingLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#ffffff',
      }}
    >
      <MarketingHeader />

      <div style={{ flex: 1 }}>{children}</div>

      <footer
        style={{
          borderTop: '1px solid #e5e7eb',
          background: '#fff',
          marginTop: 48,
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: '0 auto',
            padding: '20px 16px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 16,
            fontSize: 14,
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              color: '#6b7280',
              fontSize: 13,
            }}
          >
            © {new Date().getFullYear()} Seikyu Note
          </div>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 16,
            }}
          >
            <Link
              href="/pricing"
              style={{ color: '#374151', textDecoration: 'none' }}
            >
              料金プラン
            </Link>
            <Link
              href="/privacy"
              style={{ color: '#374151', textDecoration: 'none' }}
            >
              プライバシーポリシー
            </Link>
            <Link
              href="/terms"
              style={{ color: '#374151', textDecoration: 'none' }}
            >
              利用規約
            </Link>
            <Link
              href="/legal"
              style={{ color: '#374151', textDecoration: 'none' }}
            >
              特定商取引法に基づく表記
            </Link>
            <Link
              href="/contact"
              style={{ color: '#374151', textDecoration: 'none' }}
            >
              お問い合わせ
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}