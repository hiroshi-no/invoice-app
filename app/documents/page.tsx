import Link from 'next/link'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getCurrentOrgIdForUser } from '@/lib/org/getCurrentOrgId'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

async function getCookieStore() {
  const c: any = cookies()
  return typeof c?.then === 'function' ? await c : c
}

async function createSupabase() {
  const cookieStore = await getCookieStore()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll().map((c: any) => ({
          name: c.name,
          value: c.value,
        }))
      },
      setAll() {
        /* noop */
      },
    },
  })
}

function labelDocType(v: any) {
  const s = String(v ?? '').toLowerCase()
  if (s === 'invoice') return '請求書'
  if (s === 'quote' || s === 'quotation') return '見積書'
  return String(v ?? '-')
}

function labelStatus(v: any) {
  const s = String(v ?? '').toLowerCase()
  if (s === 'draft') return '下書き'
  if (s === 'issued') return '発行済み'
  if (s === 'paid') return '支払済み'
  if (s === 'cancelled') return '取消'
  return String(v ?? '-')
}

export default async function DocumentsPage() {
  const supabase = await createSupabase()

  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) {
    return (
      <div style={{ maxWidth: 860, margin: '40px auto', fontFamily: 'sans-serif' }}>
        <h1>書類一覧</h1>
        <p>
          ログインが必要です。<Link href="/login">ログインへ</Link>
        </p>
      </div>
    )
  }

  let orgId = ''
  try {
    const currentOrgId = await getCurrentOrgIdForUser(supabase as any, userData.user.id)

    orgId = String(currentOrgId ?? '')
    if (!UUID_RE.test(orgId)) {
      throw new Error('current_org_id invalid')
    }
  } catch (e: any) {
    return (
      <div style={{ maxWidth: 860, margin: '40px auto', fontFamily: 'sans-serif' }}>
        <h1>書類一覧</h1>
        <p style={{ color: 'crimson' }}>エラー: {e?.message ?? 'org not found'}</p>
        <p>
          <Link href="/dashboard/monthly">戻る</Link>
        </p>
      </div>
    )
  }

  const { data: docs, error } = await supabase
    .from('documents')
    .select('id, doc_type, status, document_no, issued_at, total_amount, currency, customer_id')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div style={{ maxWidth: 980, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
        <h1>書類一覧</h1>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <Link
            href="/documents/new?type=invoice"
            style={{
              display: 'inline-block',
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: 10,
              textDecoration: 'none',
              color: '#111',
              background: '#fff',
            }}
          >
            新規請求書
          </Link>

          <Link
            href="/documents/new?type=quotation"
            style={{
              display: 'inline-block',
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: 10,
              textDecoration: 'none',
              color: '#111',
              background: '#fff',
            }}
          >
            新規見積書
          </Link>

          <Link href="/debug">デバッグ</Link>
        </div>
      </div>

      {error && <p style={{ color: 'crimson' }}>エラー: {error.message}</p>}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={th}>種別</th>
            <th style={th}>番号</th>
            <th style={th}>状態</th>
            <th style={th}>発行日</th>
            <th style={th}>合計</th>
            <th style={th}>詳細</th>
          </tr>
        </thead>
        <tbody>
          {(docs ?? []).map((d: any) => (
            <tr key={d.id}>
              <td style={td}>{labelDocType(d.doc_type)}</td>
              <td style={td}>{d.document_no ?? '-'}</td>
              <td style={td}>{labelStatus(d.status)}</td>
              <td style={td}>{d.issued_at ?? '-'}</td>
              <td style={td}>
                {(d.total_amount ?? 0).toLocaleString()} {d.currency ?? 'JPY'}
              </td>
              <td style={td}>
                <Link href={`/documents/${d.id}`}>開く</Link>
              </td>
            </tr>
          ))}
          {(docs ?? []).length === 0 && (
            <tr>
              <td style={td} colSpan={6}>
                書類がまだありません。
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

const th = { textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 } as const
const td = { borderBottom: '1px solid #eee', padding: 8 } as const