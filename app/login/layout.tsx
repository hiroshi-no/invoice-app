import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ログイン',
  description: 'Seikyu Note のログインページです。',
  robots: {
    index: false,
    follow: false,
  },
}

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}