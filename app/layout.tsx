import type { Metadata } from 'next'
import Link from 'next/link'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import HeaderGate from './components/HeaderGate'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  metadataBase: new URL('https://seikyunote.com'),
  title: {
    default: 'Seikyu Note | 請求書・見積書PDF作成アプリ',
    template: '%s | Seikyu Note',
  },
  description:
    'Seikyu Note は、請求書・見積書を作成し、PDFプレビュー・保存・発行まで行えるWebアプリです。',
  applicationName: 'Seikyu Note',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Seikyu Note | 請求書・見積書PDF作成アプリ',
    description:
      '請求書・見積書の作成、PDFプレビュー、保存、発行まで行えるWebアプリです。',
    url: 'https://seikyunote.com',
    siteName: 'Seikyu Note',
    locale: 'ja_JP',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Seikyu Note | 請求書・見積書PDF作成アプリ',
    description:
      '請求書・見積書の作成、PDFプレビュー、保存、発行まで行えるWebアプリです。',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            background: '#ffffff',
          }}
        >
          <HeaderGate />

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
      </body>
    </html>
  )
}