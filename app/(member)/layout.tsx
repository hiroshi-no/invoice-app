import type { Metadata } from 'next'
import HeaderGate from '@/app/components/HeaderGate'

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
}

export default function MemberLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <HeaderGate>{children}</HeaderGate>
}