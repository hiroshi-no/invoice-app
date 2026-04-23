import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

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
        {children}
      </body>
    </html>
  )
}