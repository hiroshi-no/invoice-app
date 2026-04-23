import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '新しいパスワードの設定',
  description: 'Seikyu Note の新しいパスワード設定ページです。',
  robots: {
    index: false,
    follow: false,
  },
}

export default function UpdatePasswordLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}