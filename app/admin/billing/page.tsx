import Link from 'next/link'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getAdminContext } from '@/lib/authz/getAdminContext'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type SearchParams = {
  q?: string
  plan?: string
  status?: string
}

type Props = {
  searchParams?: Promise<SearchParams> | SearchParams
}

type SubscriptionRow = {
  org_id: string
  plan_key: string | null
  status: string | null
  stripe_status: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean | null
  updated_at?: string | null
}

function cardStyle(): React.CSSProperties {
  return {
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    background: '#fff',
    padding: 16,
  }
}

function formatDateTime(value: string | null | undefined) {
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

function normalizeKeyword(raw: string | undefined) {
  return String(raw ?? '').trim().slice(0, 100)
}

function normalizePlan(raw: string | undefined) {
  if (raw === 'free' || raw === 'starter' || raw === 'standard') return raw
  return 'all'
}

function normalizeStatus(raw: string | undefined) {
  if (!raw) return 'all'
  return raw.trim() || 'all'
}

function createdAtTime(value: string | null | undefined) {
  if (!value) return 0
  const t = new Date(value).getTime()
  return Number.isNaN(t) ? 0 : t
}

function planBadgeStyle(planKey: string | null): React.CSSProperties {
  if (planKey === 'standard') {
    return {
      background: '#ede9fe',
      color: '#6d28d9',
      border: '1px solid #c4b5fd',
    }
  }

  if (planKey === 'starter') {
    return {
      background: '#dbeafe',
      color: '#1d4ed8',
      border: '1px solid #93c5fd',
    }
  }

  return {
    background: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
  }
}

function stripeStatusBadgeStyle(status: string | null): React.CSSProperties {
  if (status === 'active' || status === 'trialing') {
    return {
      background: '#dcfce7',
      color: '#166534',
      border: '1px solid #86efac',
    }
  }

  if (status === 'canceled' || status === 'cancelled') {
    return {
      background: '#fee2e2',
      color: '#991b1b',
      border: '1px solid #fca5a5',
    }
  }

  if (status === 'past_due' || status === 'unpaid') {
    return {
      background: '#fffbeb',
      color: '#92400e',
      border: '1px solid #fde68a',
    }
  }

  return {
    background: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
  }
}

export default async function AdminBillingPage({ searchParams }: Props) {
  const ctx = await getAdminContext()

  if (!ctx.ok) {
    return null
  }

  const resolvedSearchParams =
    searchParams && typeof (searchParams as any)?.then === 'function'
      ? await (searchParams as Promise<SearchParams>)
      : (searchParams ?? {})

  const q = normalizeKeyword(resolvedSearchParams.q)
  const plan = normalizePlan(resolvedSearchParams.plan)
  const status = normalizeStatus(resolvedSearchParams.status)

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    return (
      <main style={{ maxWidth: 1120, margin: '0 auto', padding: '24px 16px 48px' }}>
        <div style={{ marginBottom: 16 }}>
          <Link
            href="/admin"
            style={{ color: '#2563eb', textDecoration: 'none', fontSize: 14 }}
          >
            ← 管理画面トップへ
          </Link>
        </div>

        <section style={cardStyle()}>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 12px' }}>
            課金確認
          </h1>
          <div style={{ color: '#991b1b', lineHeight: 1.8 }}>
            環境変数が不足しています。`NEXT_PUBLIC_SUPABASE_URL` と
            `SUPABASE_SERVICE_ROLE_KEY` を確認してください。
          </div>
        </section>
      </main>
    )
  }

  const adminSupabase = createAdminClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  const { data, error } = await adminSupabase
    .from('subscriptions')
    .select(
      'org_id, plan_key, status, stripe_status, stripe_customer_id, stripe_subscription_id, current_period_end, cancel_at_period_end, updated_at'
    )
    .order('updated_at', { ascending: false })
    .limit(500)

  const rows: SubscriptionRow[] = (data ?? []) as SubscriptionRow[]

  const filteredRows = rows
    .filter((row) => {
      if (plan !== 'all' && row.plan_key !== plan) return false
      if (status !== 'all' && String(row.stripe_status ?? row.status ?? '') !== status)
        return false

      if (!q) return true

      const haystack = [
        row.org_id,
        row.plan_key ?? '',
        row.status ?? '',
        row.stripe_status ?? '',
        row.stripe_customer_id ?? '',
        row.stripe_subscription_id ?? '',
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(q.toLowerCase())
    })
    .sort((a, b) => createdAtTime(b.updated_at) - createdAtTime(a.updated_at))

  const starterCount = rows.filter((row) => row.plan_key === 'starter').length
  const standardCount = rows.filter((row) => row.plan_key === 'standard').length
  const freeCount = rows.filter((row) => row.plan_key === 'free').length
  const activePaidCount = rows.filter(
    (row) =>
      (row.plan_key === 'starter' || row.plan_key === 'standard') &&
      (row.stripe_status === 'active' || row.stripe_status === 'trialing')
  ).length

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
              style={{ color: '#2563eb', textDecoration: 'none', fontSize: 14 }}
            >
              ← 管理画面トップへ
            </Link>
          </div>

          <h1 style={{ fontSize: 30, fontWeight: 700, margin: '0 0 8px' }}>
            課金確認
          </h1>
          <p style={{ margin: 0, color: '#4b5563', lineHeight: 1.6 }}>
            subscriptions テーブルの状態を確認するページです。まずは閲覧専用で運用します。
          </p>
        </div>
      </section>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div style={cardStyle()}>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
            有料アクティブ
          </div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{activePaidCount}</div>
        </div>

        <div style={cardStyle()}>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
            Starter
          </div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{starterCount}</div>
        </div>

        <div style={cardStyle()}>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
            Standard
          </div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{standardCount}</div>
        </div>

        <div style={cardStyle()}>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
            Free
          </div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{freeCount}</div>
        </div>
      </section>

      <section style={{ ...cardStyle(), marginBottom: 16 }}>
        <form
          method="get"
          style={{
            display: 'grid',
            gridTemplateColumns: '180px 180px minmax(240px, 1fr) auto',
            gap: 12,
            alignItems: 'end',
          }}
        >
          <div>
            <label
              htmlFor="plan"
              style={{
                display: 'block',
                fontSize: 13,
                color: '#374151',
                marginBottom: 6,
              }}
            >
              プラン
            </label>
            <select
              id="plan"
              name="plan"
              defaultValue={plan}
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
              <option value="free">free</option>
              <option value="starter">starter</option>
              <option value="standard">standard</option>
            </select>
          </div>

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
              Stripe状態
            </label>
            <input
              id="status"
              name="status"
              defaultValue={status === 'all' ? '' : status}
              placeholder="active など"
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
              placeholder="org_id / customer_id / subscription_id"
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
              href="/admin/billing"
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

      <section style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, color: '#6b7280' }}>
          {error ? 'subscriptions の取得に失敗しました。' : `${filteredRows.length}件を表示中`}
        </div>
      </section>

      {error ? (
        <section style={cardStyle()}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>エラー</div>
          <div style={{ color: '#991b1b', lineHeight: 1.8 }}>
            subscriptions の取得に失敗しました。時間をおいて再試行してください。
          </div>
          <div style={{ marginTop: 8, fontSize: 13, color: '#6b7280' }}>
            detail: {error.message}
          </div>
        </section>
      ) : filteredRows.length === 0 ? (
        <section style={cardStyle()}>
          <div
            style={{
              border: '1px dashed #d1d5db',
              borderRadius: 12,
              padding: 20,
              color: '#6b7280',
            }}
          >
            条件に一致する課金データはありません。
          </div>
        </section>
      ) : (
        <section style={{ display: 'grid', gap: 12 }}>
          {filteredRows.map((row) => (
            <article
              key={`${row.org_id}:${row.stripe_subscription_id ?? 'none'}`}
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
                    org_id: {row.org_id}
                  </div>
                  <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>
                    updated_at: {formatDateTime(row.updated_at)}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '4px 10px',
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 700,
                      ...planBadgeStyle(row.plan_key),
                    }}
                  >
                    {row.plan_key ?? '-'}
                  </div>

                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '4px 10px',
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 700,
                      ...stripeStatusBadgeStyle(row.stripe_status ?? row.status),
                    }}
                  >
                    {row.stripe_status ?? row.status ?? '-'}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: 10,
                  fontSize: 14,
                  color: '#374151',
                }}
              >
                <div>
                  <strong>plan_key:</strong> {row.plan_key ?? '-'}
                </div>
                <div>
                  <strong>status:</strong> {row.status ?? '-'}
                </div>
                <div>
                  <strong>stripe_status:</strong> {row.stripe_status ?? '-'}
                </div>
                <div>
                  <strong>current_period_end:</strong> {formatDateTime(row.current_period_end)}
                </div>
                <div>
                  <strong>cancel_at_period_end:</strong>{' '}
                  {row.cancel_at_period_end ? 'true' : 'false'}
                </div>
                <div>
                  <strong>stripe_customer_id:</strong>{' '}
                  {row.stripe_customer_id ?? '-'}
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <strong>stripe_subscription_id:</strong>{' '}
                  {row.stripe_subscription_id ?? '-'}
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  )
}