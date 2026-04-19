import Link from 'next/link'
import { getAdminContext } from '@/lib/authz/getAdminContext'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type SearchParams = {
  status?: string
  q?: string
  hasNote?: string
}

type Props = {
  searchParams?: Promise<SearchParams> | SearchParams
}

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

function truncate(text: string | null, max = 160) {
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

function cardStyle(): React.CSSProperties {
  return {
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    background: '#fff',
    padding: 16,
  }
}

function normalizeStatus(raw: string | undefined) {
  if (raw === 'new' || raw === 'in_progress' || raw === 'done') return raw
  return 'all'
}

function normalizeKeyword(raw: string | undefined) {
  return String(raw ?? '')
    .trim()
    .replace(/[(),]/g, ' ')
    .slice(0, 100)
}

function normalizeHasNote(raw: string | undefined) {
  return raw === '1' ? '1' : '0'
}

function buildInquiriesHref(params: {
  status?: string
  q?: string
  hasNote?: string
}) {
  const sp = new URLSearchParams()

  if (params.status && params.status !== 'all') {
    sp.set('status', params.status)
  }

  if (params.q && params.q.trim()) {
    sp.set('q', params.q.trim())
  }

  if (params.hasNote === '1') {
    sp.set('hasNote', '1')
  }

  const qs = sp.toString()
  return qs ? `/admin/inquiries?${qs}` : '/admin/inquiries'
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

export default async function AdminInquiriesPage({ searchParams }: Props) {
  const ctx = await getAdminContext()

  if (!ctx.ok) {
    return null
  }

  const resolvedSearchParams: SearchParams = await Promise.resolve(searchParams ?? {})

  const status = normalizeStatus(resolvedSearchParams.status)
   const q = normalizeKeyword(resolvedSearchParams.q)
   const hasNote = normalizeHasNote(resolvedSearchParams.hasNote)

  const query = ctx.supabase
    .from('contact_messages')
    .select('id, created_at, name, email, subject, message, status, admin_note')
    .order('created_at', { ascending: false })
    .limit(100)

  if (status !== 'all') {
    query.eq('status', status)
  }

  if (q) {
    query.or(
      [
        `name.ilike.*${q}*`,
        `email.ilike.*${q}*`,
        `subject.ilike.*${q}*`,
        `message.ilike.*${q}*`,
      ].join(',')
    )
  }

  if (hasNote === '1') {
  query.not('admin_note', 'is', null).neq('admin_note', '')
}

  const [newCountRes, inProgressCountRes, doneCountRes, listRes] =
    await Promise.all([
      ctx.supabase
        .from('contact_messages')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'new'),

      ctx.supabase
        .from('contact_messages')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'in_progress'),

      ctx.supabase
        .from('contact_messages')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'done'),

      query,
    ])

  const newCount = newCountRes.count ?? 0
  const inProgressCount = inProgressCountRes.count ?? 0
  const doneCount = doneCountRes.count ?? 0

  const { data, error } = listRes

  const rows: InquiryRow[] = [...(data ?? [])].sort((a, b) => {
    const statusDiff = statusPriority(a.status) - statusPriority(b.status)
    if (statusDiff !== 0) return statusDiff

    return createdAtTime(b.created_at) - createdAtTime(a.created_at)
  })

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
          <div style={{ marginBottom: 8 }}>
            <Link
              href="/admin"
              style={{
                color: '#2563eb',
                textDecoration: 'none',
                fontSize: 14,
              }}
            >
              ← 管理画面トップへ
            </Link>
          </div>

          <h1 style={{ fontSize: 30, fontWeight: 700, margin: '0 0 8px' }}>
            問い合わせ一覧
          </h1>
          <p style={{ margin: 0, color: '#4b5563', lineHeight: 1.6 }}>
            コンタクトフォームから届いた問い合わせ内容を確認します。
          </p>
        </div>
      </section>

      <section style={{ ...cardStyle(), marginBottom: 16 }}>
        <form
          method="get"
          style={{
            display: 'grid',
            gridTemplateColumns: '180px minmax(240px, 1fr) auto',
            gap: 12,
            alignItems: 'end',
          }}
        >
          <div>
            <label
              htmlFor="status"
              style={{
                display: 'block',
                fontSize: 13,
                color: '#374151',
                marginBottom: 6,
              }}
            >
              状況
            </label>
            <select
              id="status"
              name="status"
              defaultValue={status}
              style={{
                width: '100%',
                height: 40,
                borderRadius: 10,
                border: '1px solid #d1d5db',
                padding: '0 12px',
                background: '#fff',
              }}
            >
              <option value="all">すべて</option>
              <option value="new">未対応</option>
              <option value="in_progress">対応中</option>
              <option value="done">完了</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="q"
              style={{
                display: 'block',
                fontSize: 13,
                color: '#374151',
                marginBottom: 6,
              }}
            >
              キーワード
            </label>
            <input
              id="q"
              name="q"
              defaultValue={q}
              placeholder="名前 / メール / 件名 / 本文で検索"
              style={{
                width: '100%',
                height: 40,
                borderRadius: 10,
                border: '1px solid #d1d5db',
                padding: '0 12px',
                background: '#fff',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="submit"
              style={{
                height: 40,
                padding: '0 14px',
                borderRadius: 10,
                border: '1px solid #111827',
                background: '#111827',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              絞り込む
            </button>

            <Link
              href="/admin/inquiries"
              style={{
                height: 40,
                padding: '0 14px',
                borderRadius: 10,
                border: '1px solid #d1d5db',
                background: '#fff',
                color: '#111827',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              リセット
            </Link>
          </div>
        </form>
      </section>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            ...cardStyle(),
            background: '#fef2f2',
            border: '1px solid #fecaca',
          }}
        >
          <div style={{ fontSize: 13, color: '#991b1b', marginBottom: 8 }}>
            未対応
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#991b1b' }}>
            {newCount}
          </div>
        </div>

        <div
          style={{
            ...cardStyle(),
            background: '#fffbeb',
            border: '1px solid #fde68a',
          }}
        >
          <div style={{ fontSize: 13, color: '#92400e', marginBottom: 8 }}>
            対応中
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#92400e' }}>
            {inProgressCount}
          </div>
        </div>

        <div
          style={{
            ...cardStyle(),
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
          }}
        >
          <div style={{ fontSize: 13, color: '#166534', marginBottom: 8 }}>
            完了
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#166534' }}>
            {doneCount}
          </div>
        </div>
      </section>

<section
  style={{
    ...cardStyle(),
    marginBottom: 16,
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    alignItems: 'center',
  }}
>
  <div style={{ fontSize: 13, color: '#6b7280', marginRight: 4 }}>
    クイックフィルタ
  </div>

  <Link
    href={buildInquiriesHref({ q })}
    style={{
      height: 36,
      padding: '0 12px',
      borderRadius: 999,
      border:
        status === 'all' && hasNote === '0'
          ? '1px solid #111827'
          : '1px solid #d1d5db',
      background:
        status === 'all' && hasNote === '0' ? '#111827' : '#fff',
      color:
        status === 'all' && hasNote === '0' ? '#fff' : '#111827',
      textDecoration: 'none',
      display: 'inline-flex',
      alignItems: 'center',
      fontSize: 13,
      fontWeight: 700,
    }}
  >
    すべて
  </Link>

  <Link
    href={buildInquiriesHref({ status: 'new', q, hasNote })}
    style={{
      height: 36,
      padding: '0 12px',
      borderRadius: 999,
      border: status === 'new' ? '1px solid #111827' : '1px solid #d1d5db',
      background: status === 'new' ? '#111827' : '#fff',
      color: status === 'new' ? '#fff' : '#111827',
      textDecoration: 'none',
      display: 'inline-flex',
      alignItems: 'center',
      fontSize: 13,
      fontWeight: 700,
    }}
  >
    未対応だけ
  </Link>

  <Link
    href={buildInquiriesHref({ q, hasNote: '1', status })}
    style={{
      height: 36,
      padding: '0 12px',
      borderRadius: 999,
      border: hasNote === '1' ? '1px solid #111827' : '1px solid #d1d5db',
      background: hasNote === '1' ? '#111827' : '#fff',
      color: hasNote === '1' ? '#fff' : '#111827',
      textDecoration: 'none',
      display: 'inline-flex',
      alignItems: 'center',
      fontSize: 13,
      fontWeight: 700,
    }}
  >
    内部メモあり
  </Link>

  <Link
    href={buildInquiriesHref({ status: 'new', q, hasNote: '1' })}
    style={{
      height: 36,
      padding: '0 12px',
      borderRadius: 999,
      border:
        status === 'new' && hasNote === '1'
          ? '1px solid #111827'
          : '1px solid #d1d5db',
      background:
        status === 'new' && hasNote === '1' ? '#111827' : '#fff',
      color:
        status === 'new' && hasNote === '1' ? '#fff' : '#111827',
      textDecoration: 'none',
      display: 'inline-flex',
      alignItems: 'center',
      fontSize: 13,
      fontWeight: 700,
    }}
  >
    未対応 + メモあり
  </Link>

  <Link
    href="/admin/inquiries"
    style={{
      height: 36,
      padding: '0 12px',
      borderRadius: 999,
      border: '1px solid #d1d5db',
      background: '#fff',
      color: '#111827',
      textDecoration: 'none',
      display: 'inline-flex',
      alignItems: 'center',
      fontSize: 13,
    }}
  >
    フィルタ解除
  </Link>
</section>

      <section style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, color: '#6b7280' }}>
          {error
            ? '問い合わせの取得に失敗しました。'
            : `${rows.length}件を表示中（未対応 → 対応中 → 完了 の順）`}
        </div>
      </section>

      {error ? (
        <section style={cardStyle()}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>エラー</div>
          <div style={{ color: '#991b1b', lineHeight: 1.7 }}>
            問い合わせ一覧の取得に失敗しました。時間をおいて再試行してください。
          </div>
          <div style={{ marginTop: 8, fontSize: 13, color: '#6b7280' }}>
            detail: {error.message}
          </div>
        </section>
      ) : rows.length === 0 ? (
        <section style={cardStyle()}>
          <div
            style={{
              border: '1px dashed #d1d5db',
              borderRadius: 12,
              padding: 20,
              color: '#6b7280',
            }}
          >
            条件に一致する問い合わせはありません。
          </div>
        </section>
      ) : (
        <section style={{ display: 'grid', gap: 12 }}>
          {rows.map((row) => {
            const hasAdminNote = !!String(row.admin_note ?? '').trim()

            return (
              <article
                key={row.id}
                style={{
                  ...cardStyle(),
                  background: '#fafafa',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 12,
                    flexWrap: 'wrap',
                    marginBottom: 12,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>
                      {row.subject || '件名なし'}
                    </div>
                    <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>
                      {row.name || '名前なし'}
                      {' / '}
                      {row.email || 'メールなし'}
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
                    lineHeight: 1.8,
                    marginBottom: 12,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {truncate(row.message, 220)}
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

                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
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
                </div>
              </article>
            )
          })}
        </section>
      )}
    </main>
  )
}