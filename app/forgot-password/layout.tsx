import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'パスワード再設定',
  description: 'Seikyu Note のパスワード再設定ページです。',
  robots: {
    index: false,
    follow: false,
  },
}

export default function ForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}