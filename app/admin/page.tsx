import Link from 'next/link'
import { getAdminContext } from '@/lib/authz/getAdminContext'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type InquiryRow = {
  id: string
  created_at: string | null
  name: string | null
  email: string | null
  subject: string | null
  message: string | null
  status: string | null
  admin_note?: string | null
}

function formatDateTime(value: string | null) {
  if (!value) return '-'

  try {
    return new Intl.DateTimeFormat('ja-JP', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value))
  } catch {
    return value
  }
}

function truncate(text: string | null, max = 100) {
  if (!text) return ''
  return text.length > max ? `${text.slice(0, max)}…` : text
}

function statusLabel(status: string | null) {
  if (status === 'in_progress') return '対応中'
  if (status === 'done') return '完了'
  return '未対応'
}

function statusStyle(status: string | null): React.CSSProperties {
  if (status === 'in_progress') {
    return {
      background: '#fef3c7',
      color: '#92400e',
      border: '1px solid #fcd34d',
    }
  }

  if (status === 'done') {
    return {
      background: '#dcfce7',
      color: '#166534',
      border: '1px solid #86efac',
    }
  }

  return {
    background: '#fee2e2',
    color: '#991b1b',
    border: '1px solid #fca5a5',
  }
}

function statusPriority(status: string | null) {
  if (status === 'new') return 0
  if (status === 'in_progress') return 1
  if (status === 'done') return 2
  return 9
}

function createdAtTime(value: string | null) {
  if (!value) return 0
  const t = new Date(value).getTime()
  return Number.isNaN(t) ? 0 : t
}

function cardStyle(): React.CSSProperties {
  return {
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    background: '#fff',
    padding: 16,
  }
}

function navCardStyle(): React.CSSProperties {
  return {
    border: '1px solid #e5e7eb',
    borderRadius: 14,
    background: '#fff',
    padding: 18,
    textDecoration: 'none',
    color: '#111827',
    display: 'block',
  }
}

export default async function AdminPage() {
  const ctx = await getAdminContext()

  if (!ctx.ok) {
    return null
  }

  const supabase = ctx.supabase

  const startOfTodayJst = new Date()
  const jstNow = new Date(
    new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date())
  )
  startOfTodayJst.setTime(jstNow.getTime())
  startOfTodayJst.setHours(0, 0, 0, 0)
  const startOfTodayIso = new Date(
    startOfTodayJst.getTime() - 9 * 60 * 60 * 1000
  ).toISOString()

  const [
    newInquiryCountRes,
    inProgressInquiryCountRes,
    todayInquiriesCountRes,
    paidSubscriptionsCountRes,
    issuedDocumentsCountRes,
    customersCountRes,
    recentInquiriesRes,
  ] = await Promise.all([
    supabase
      .from('contact_messages')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'new'),

    supabase
      .from('contact_messages')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'in_progress'),

    supabase
      .from('contact_messages')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfTodayIso),

    supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .in('plan_key', ['starter', 'standard'])
      .in('stripe_status', ['active', 'trialing']),

    supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'issued'),

    supabase
      .from('customers')
      .select('*', { count: 'exact', head: true }),

    supabase
       .from('contact_messages')
       .select('id, created_at, name, email, subject, message, status, admin_note')
       .order('created_at', { ascending: false })
       .limit(12)
  ])

  const newInquiryCount = newInquiryCountRes.count ?? 0
  const inProgressInquiryCount = inProgressInquiryCountRes.count ?? 0
  const todayInquiryCount = todayInquiriesCountRes.count ?? 0
  const paidOrgCount = paidSubscriptionsCountRes.count ?? 0
  const issuedDocumentCount = issuedDocumentsCountRes.count ?? 0
  const customerCount = customersCountRes.count ?? 0
  const recentInquiries: InquiryRow[] = [...(recentInquiriesRes.data ?? [])]
  .sort((a, b) => {
    const statusDiff = statusPriority(a.status) - statusPriority(b.status)
    if (statusDiff !== 0) return statusDiff

    return createdAtTime(b.created_at) - createdAtTime(a.created_at)
  })
  .slice(0, 5)

  return (
    <main style={{ maxWidth: 1120, margin: '0 auto', padding: '24px 16px 48px' }}>
      <section
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 16,
          marginBottom: 24,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1 style={{ fontSize: 30, fontWeight: 700, margin: '0 0 8px' }}>
            管理画面
          </h1>
          <p style={{ margin: 0, color: '#4b5563', lineHeight: 1.6 }}>
            運営用の確認・対応ページです。問い合わせ、ユーザー、課金、利用状況をここから確認します。
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <Link
            href="/api/admin/ping"
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid #d1d5db',
              background: '#fff',
              textDecoration: 'none',
              color: '#111827',
              fontSize: 14,
            }}
          >
            admin ping 確認
          </Link>
        </div>
      </section>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div style={cardStyle()}>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
            未対応の問い合わせ
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 10 }}>
            {newInquiryCount}
          </div>
          <div style={{ color: '#6b7280', fontSize: 14 }}>
            いま優先して見るべき件数
          </div>
        </div>

        <div style={cardStyle()}>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
            対応中の問い合わせ
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 10 }}>
            {inProgressInquiryCount}
          </div>
          <div style={{ color: '#6b7280', fontSize: 14 }}>
            保留・継続対応中の件数
          </div>
        </div>

        <div style={cardStyle()}>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
            本日の問い合わせ
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 10 }}>
            {todayInquiryCount}
          </div>
          <div style={{ color: '#6b7280', fontSize: 14 }}>
            JSTの日付基準で集計
          </div>
        </div>

        <div style={cardStyle()}>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
            有料利用組織
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 10 }}>
            {paidOrgCount}
          </div>
          <div style={{ color: '#6b7280', fontSize: 14 }}>
            Starter / Standard のアクティブ件数
          </div>
        </div>

        <div style={cardStyle()}>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
            発行済み書類数
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 10 }}>
            {issuedDocumentCount}
          </div>
          <div style={{ color: '#6b7280', fontSize: 14 }}>
            status = issued の総件数
          </div>
        </div>

        <div style={cardStyle()}>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
            顧客総数
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 10 }}>
            {customerCount}
          </div>
          <div style={{ color: '#6b7280', fontSize: 14 }}>
            customers テーブルの総件数
          </div>
        </div>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ margin: '0 0 12px', fontSize: 20, fontWeight: 700 }}>
          管理ページ
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 16,
          }}
        >
          <Link href="/admin/inquiries" style={navCardStyle()}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
              問い合わせ管理
            </div>
            <div style={{ fontSize: 14, color: '#4b5563', lineHeight: 1.7 }}>
              一覧、詳細、対応状況、内部メモを確認します。
            </div>
          </Link>

          <Link href="/admin/users" style={navCardStyle()}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
              ユーザー確認
            </div>
            <div style={{ fontSize: 14, color: '#4b5563', lineHeight: 1.7 }}>
              email、user_id、current_org_id、role を確認します。
            </div>
          </Link>

          <Link href="/admin/billing" style={navCardStyle()}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
              課金確認
            </div>
            <div style={{ fontSize: 14, color: '#4b5563', lineHeight: 1.7 }}>
              subscriptions の plan_key、stripe_status、更新期限を確認します。
            </div>
          </Link>

          <Link href="/admin/usage" style={navCardStyle()}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
              利用状況
            </div>
            <div style={{ fontSize: 14, color: '#4b5563', lineHeight: 1.7 }}>
              組織ごとの発行件数、顧客数、プラン上限を確認します。
            </div>
          </Link>
        </div>
      </section>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 2fr) minmax(320px, 1fr)',
          gap: 16,
          alignItems: 'start',
        }}
      >
        <div style={cardStyle()}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              marginBottom: 16,
            }}
          >
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
              最近の問い合わせ
            </h2>
            <Link
              href="/admin/inquiries"
              style={{ color: '#2563eb', textDecoration: 'none', fontSize: 14 }}
            >
              一覧へ
            </Link>
          </div>

          {recentInquiries.length === 0 ? (
            <div
              style={{
                border: '1px dashed #d1d5db',
                borderRadius: 12,
                padding: 20,
                color: '#6b7280',
              }}
            >
              問い合わせはまだありません。
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {recentInquiries.map((row) => {
                const hasAdminNote = !!String(row.admin_note ?? '').trim()

                return (
                  <article
                    key={row.id}
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: 12,
                      padding: 14,
                      background: '#fafafa',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: 12,
                        marginBottom: 10,
                        flexWrap: 'wrap',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, marginBottom: 4 }}>
                          {row.subject || '件名なし'}
                        </div>
                        <div style={{ fontSize: 13, color: '#6b7280' }}>
                          {row.name || '名前なし'} / {row.email || 'メールなし'}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {hasAdminNote ? (
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '4px 10px',
                              borderRadius: 999,
                              fontSize: 12,
                              fontWeight: 700,
                              background: '#dbeafe',
                              color: '#1d4ed8',
                              border: '1px solid #93c5fd',
                            }}
                          >
                            内部メモあり
                          </div>
                        ) : null}

                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '4px 10px',
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 700,
                            ...statusStyle(row.status),
                          }}
                        >
                          {statusLabel(row.status)}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        fontSize: 14,
                        color: '#374151',
                        lineHeight: 1.7,
                        marginBottom: 10,
                      }}
                    >
                      {truncate(row.message, 140)}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 12,
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ fontSize: 12, color: '#6b7280' }}>
                        受信日時: {formatDateTime(row.created_at)}
                      </div>

                      <Link
                        href={`/admin/inquiries/${row.id}`}
                        style={{
                          color: '#2563eb',
                          textDecoration: 'none',
                          fontSize: 14,
                        }}
                      >
                        詳細を見る
                      </Link>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gap: 16 }}>
          <section style={cardStyle()}>
            <h2 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700 }}>
              管理用ショートカット
            </h2>
            <div style={{ display: 'grid', gap: 10 }}>
              <Link href="/admin/inquiries" style={{ color: '#2563eb', textDecoration: 'none' }}>
                問い合わせ一覧
              </Link>
              <Link href="/admin/users" style={{ color: '#2563eb', textDecoration: 'none' }}>
                ユーザー確認
              </Link>
              <Link href="/admin/billing" style={{ color: '#2563eb', textDecoration: 'none' }}>
                課金確認
              </Link>
              <Link href="/admin/usage" style={{ color: '#2563eb', textDecoration: 'none' }}>
                利用状況
              </Link>
              <Link href="/api/admin/ping" style={{ color: '#2563eb', textDecoration: 'none' }}>
                admin ping 確認
              </Link>
            </div>
          </section>

          <section style={cardStyle()}>
            <h2 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700 }}>
              現在のログイン情報
            </h2>
            <div style={{ display: 'grid', gap: 8, fontSize: 14 }}>
              <div>
                <strong>email:</strong> {ctx.user.email ?? '-'}
              </div>
              <div>
                <strong>orgId:</strong> {ctx.orgId}
              </div>
              <div>
                <strong>role:</strong> {ctx.role}
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  )
}