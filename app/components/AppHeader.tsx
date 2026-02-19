// app/components/AppHeader.tsx
import Link from 'next/link'
import { LogoutButton } from './LogoutButton'   // ← ここだけ変更

export default function AppHeader() {
  return (
    <header style={{ borderBottom: '1px solid #580505', background: '#fff' }}>
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link href="/" style={{ fontWeight: 700, textDecoration: 'none', color: '#111' }}>
            Invoice App
          </Link>

          <nav style={{ display: 'flex', gap: 12, fontSize: 14 }}>
            <Link href="/dashboard" style={{ textDecoration: 'none', color: '#111' }}>
              Dashboard
            </Link>
            <Link href="/documents" style={{ textDecoration: 'none', color: '#111' }}>
              Documents
            </Link>
            <Link href="/settings/branding" style={{ textDecoration: 'none', color: '#111' }}>
              Branding
            </Link>
          </nav>
        </div>

        <LogoutButton />
      </div>
    </header>
  )
}
