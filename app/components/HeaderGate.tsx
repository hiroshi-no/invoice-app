'use client'

import { usePathname } from 'next/navigation'
import AppHeader from './AppHeader'

export default function HeaderGate() {
  const pathname = usePathname()

  // /login だけヘッダーを出さない（/login/xxx も含めたいなら startsWith）
  if (pathname === '/login' || pathname.startsWith('/login/')) {
    return null
  }

  return <AppHeader />
}
