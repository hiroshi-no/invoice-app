import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  robots: {
    index: true,
    follow: true,
  },
}

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
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
          }}
        >
          <Link href="/privacy">プライバシーポリシー</Link>
          <Link href="/terms">利用規約</Link>
          <Link href="/legal">特定商取引法に基づく表記</Link>
          <Link href="/contact">お問い合わせ</Link>
        </div>
      </footer>
    </div>
  )
}