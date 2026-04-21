import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAdminContext } from '@/lib/authz/getAdminContext'
import AdminNav from './AdminNav'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

function statusChipStyle(kind: 'new' | 'in_progress'): React.CSSProperties {
  if (kind === 'in_progress') {
    return {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      height: 28,
      padding: '0 10px',
      borderRadius: 999,
      background: '#fffbeb',
      color: '#92400e',
      border: '1px solid #fde68a',
      fontSize: 12,
      fontWeight: 700,
      lineHeight: 1,
    }
  }

  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    height: 28,
    padding: '0 10px',
    borderRadius: 999,
    background: '#fef2f2',
    color: '#991b1b',
    border: '1px solid #fecaca',
    fontSize: 12,
    fontWeight: 700,
    lineHeight: 1,
  }
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const ctx = await getAdminContext()

  if (!ctx.ok) {
    redirect('/documents')
  }

  const [newCountRes, inProgressCountRes] = await Promise.all([
    ctx.supabase
      .from('contact_messages')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'new'),

    ctx.supabase
      .from('contact_messages')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'in_progress'),
  ])

  const unresolvedInquiryCount = newCountRes.count ?? 0
  const inProgressInquiryCount = inProgressCountRes.count ?? 0

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <header
        style={{
          borderBottom: '1px solid #e5e7eb',
          background: '#fff',
          position: 'sticky',
          top: 0,
          zIndex: 20,
        }}
      >
        <div
          style={{
            maxWidth: 1120,
            margin: '0 auto',
            padding: '14px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
              Seikyu Note 管理画面
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flexWrap: 'wrap',
                fontSize: 13,
                color: '#6b7280',
              }}
            >
              <span>
                {ctx.user.email ?? '-'} / role: {ctx.role}
              </span>

              <span style={statusChipStyle('new')}>
                未対応
                <span>{unresolvedInquiryCount > 99 ? '99+' : unresolvedInquiryCount}</span>
              </span>

              <span style={statusChipStyle('in_progress')}>
                対応中
                <span>{inProgressInquiryCount > 99 ? '99+' : inProgressInquiryCount}</span>
              </span>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <AdminNav unresolvedInquiryCount={unresolvedInquiryCount} />

            <Link
              href="/documents"
              style={{
                height: 38,
                padding: '0 14px',
                borderRadius: 999,
                border: '1px solid #d1d5db',
                background: '#fff',
                color: '#111827',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                fontSize: 14,
              }}
            >
              通常画面へ
            </Link>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '20px 16px 48px' }}>
        {children}
      </div>
    </div>
  )
}