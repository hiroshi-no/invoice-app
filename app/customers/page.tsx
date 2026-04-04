import Link from 'next/link'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getCurrentOrgIdForUser } from '@/lib/org/getCurrentOrgId'
import PlanStatusBanner from '@/app/components/PlanStatusBanner'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function getCookieStore() {
  const c: any = cookies()
  return typeof c?.then === 'function' ? await c : c
}

async function createSupabase() {
  const cookieStore = await getCookieStore()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('Missing env: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

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

export default async function CustomersPage() {
  const supabase = await createSupabase()

  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) {
    return (
      <div style={{ maxWidth: 980, margin: '40px auto', fontFamily: 'sans-serif' }}>
        <h1>顧客一覧</h1>
        <p>
          ログインが必要です。<Link href="/login">ログインへ</Link>
        </p>
      </div>
    )
  }

  const orgId = await getCurrentOrgIdForUser(supabase as any, userData.user.id)
  if (!orgId) {
    return (
      <div style={{ maxWidth: 980, margin: '40px auto', fontFamily: 'sans-serif' }}>
        <h1>顧客一覧</h1>
        <p style={{ color: 'crimson' }}>current_org_id が見つかりません。</p>
      </div>
    )
  }

  const { data: customers, error } = await supabase
    .from('customers')
    .select('id, name, email, phone')
    .eq('org_id', orgId)
    .order('name', { ascending: true })
    .limit(500)

  if (error) {
    return (
      <div style={{ maxWidth: 980, margin: '40px auto', fontFamily: 'sans-serif' }}>
        <h1>顧客一覧</h1>
        <p style={{ color: 'crimson' }}>エラー: {error.message}</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 980, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h1 style={{ margin: 0 }}>顧客一覧</h1>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link href="/documents">書類一覧</Link>
          <Link href="/customers/new">新規作成</Link>
        </div>
      </div>

      <p style={{ color: '#666', marginTop: 12 }}>
        顧客マスタの一覧です。書類編集画面の「顧客マスタから選択」に表示される元データです。
      </p>

      <PlanStatusBanner kind="customers" />

      {!customers || customers.length === 0 ? (
        <div style={emptyBox}>
          <p style={{ margin: 0 }}>顧客がまだ登録されていません。</p>
          <div style={{ marginTop: 12 }}>
            <Link href="/customers/new">最初の顧客を登録する</Link>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 16, overflowX: 'auto' }}>
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>顧客名</th>
                <th style={th}>メールアドレス</th>
                <th style={th}>電話番号</th>
                <th style={th}>操作</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c: any) => (
                <tr key={c.id}>
                  <td style={td}>{c.name}</td>
                  <td style={td}>{c.email ?? '-'}</td>
                  <td style={td}>{c.phone ?? '-'}</td>
                  <td style={td}>
                    <Link href={`/customers/${c.id}/edit`}>編集</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const table = {
  width: '100%',
  borderCollapse: 'collapse' as const,
  background: '#fff',
}

const th = {
  textAlign: 'left' as const,
  borderBottom: '1px solid #ddd',
  padding: '10px 12px',
  background: '#f8f8f8',
  fontSize: 14,
}

const td = {
  borderBottom: '1px solid #eee',
  padding: '10px 12px',
  fontSize: 14,
  verticalAlign: 'top' as const,
}

const emptyBox = {
  marginTop: 16,
  padding: 16,
  border: '1px solid #eee',
  borderRadius: 8,
  background: '#fff',
}