'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/admin', label: 'トップ' },
  { href: '/admin/inquiries', label: '問い合わせ' },
  { href: '/admin/users', label: 'ユーザー' },
  { href: '/admin/billing', label: '課金' },
  { href: '/admin/usage', label: '利用状況' },
]

function isActive(pathname: string, href: string) {
  if (href === '/admin') return pathname === '/admin'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function AdminNav({
  unresolvedInquiryCount = 0,
}: {
  unresolvedInquiryCount?: number
}) {
  const pathname = usePathname()

  return (
    <nav
      style={{
        display: 'flex',
        gap: 8,
        flexWrap: 'wrap',
      }}
    >
      {links.map((link) => {
        const active = isActive(pathname, link.href)
        const showBadge = link.href === '/admin/inquiries' && unresolvedInquiryCount > 0

        return (
          <Link
            key={link.href}
            href={link.href}
            style={{
              height: 38,
              padding: '0 14px',
              borderRadius: 999,
              border: active ? '1px solid #111827' : '1px solid #d1d5db',
              background: active ? '#111827' : '#fff',
              color: active ? '#fff' : '#111827',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            <span>{link.label}</span>

            {showBadge ? (
              <span
                style={{
                  minWidth: 20,
                  height: 20,
                  padding: '0 6px',
                  borderRadius: 999,
                  background: active ? '#fff' : '#dc2626',
                  color: active ? '#111827' : '#fff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                  lineHeight: 1,
                }}
              >
                {unresolvedInquiryCount > 99 ? '99+' : unresolvedInquiryCount}
              </span>
            ) : null}
          </Link>
        )
      })}
    </nav>
  )
}