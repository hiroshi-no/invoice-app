import Link from 'next/link'
import { getAdminContext } from '@/lib/authz/getAdminContext'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const ctx = await getAdminContext()

  if (!ctx.ok) {
    return null
  }

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>Admin</h1>

      <div
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          padding: 16,
          background: '#fff',
          marginBottom: 16,
        }}
      >
        <div style={{ marginBottom: 8 }}>
          <strong>user:</strong> {ctx.user.email}
        </div>
        <div style={{ marginBottom: 8 }}>
          <strong>orgId:</strong> {ctx.orgId}
        </div>
        <div>
          <strong>role:</strong> {ctx.role}
        </div>
      </div>

      <div
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          padding: 16,
          background: '#fff',
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 8 }}>確認用リンク</div>
        <ul style={{ paddingLeft: 18, margin: 0 }}>
          <li>
            <Link href="/api/admin/ping">/api/admin/ping</Link>
          </li>
        </ul>
      </div>
    </main>
  )
}