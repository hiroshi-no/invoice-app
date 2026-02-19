import Link from 'next/link'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function createSupabase() {
  const cookieStore = await cookies()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll().map((c) => ({ name: c.name, value: c.value }))
      },
      // Server Componentでは set はできないので no-op
      setAll() {
        /* noop */
      },
    },
  })
}

export default async function DocumentsPage() {
  const supabase = await createSupabase()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return (
      <div style={{ maxWidth: 860, margin: '40px auto', fontFamily: 'sans-serif' }}>
        <h1>Documents</h1>
        <p>Not logged in. <Link href="/login">Go to login</Link></p>
      </div>
    )
  }

  const { data: docs, error } = await supabase
    .from('documents')
    .select('id, doc_type, status, document_no, issued_at, total_amount, currency, customer_id')
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div style={{ maxWidth: 980, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h1>Documents</h1>
        <Link href="/debug">debug</Link>
      </div>

      {error && <p style={{ color: 'crimson' }}>Error: {error.message}</p>}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={th}>Type</th>
            <th style={th}>No</th>
            <th style={th}>Status</th>
            <th style={th}>Issued</th>
            <th style={th}>Total</th>
            <th style={th}>Open</th>
          </tr>
        </thead>
        <tbody>
          {(docs ?? []).map((d) => (
            <tr key={d.id}>
              <td style={td}>{d.doc_type}</td>
              <td style={td}>{d.document_no ?? '-'}</td>
              <td style={td}>{d.status}</td>
              <td style={td}>{d.issued_at ?? '-'}</td>
              <td style={td}>
                {(d.total_amount ?? 0).toLocaleString()} {d.currency ?? 'JPY'}
              </td>
              <td style={td}>
                <Link href={`/documents/${d.id}`}>Open</Link>
              </td>
            </tr>
          ))}
          {(docs ?? []).length === 0 && (
            <tr>
              <td style={td} colSpan={6}>No documents yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

const th = { textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 } as const
const td = { borderBottom: '1px solid #eee', padding: 8 } as const