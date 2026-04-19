import Link from 'next/link'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getAdminContext } from '@/lib/authz/getAdminContext'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type SearchParams = {
  q?: string
  plan?: string
  onlyOver?: string
}

type Props = {
  searchParams?: Promise<SearchParams> | SearchParams
}

type SubscriptionRow = {
  org_id: string
  plan_key: string | null
  stripe_status: string | null
  updated_at: string | null
}

type DocumentRow = {
  org_id: string
  status: string | null
}

type CustomerRow = {
  org_id: string
}

type PlanKey = 'free' | 'starter' | 'standard'

type UsageRow = {
  orgId: string
  planKey: PlanKey
  stripeStatus: string | null
  updatedAt: string | null
  issuedCount: number
  issuedLimit: number | null
  issuedRemaining: number | null
  customerCount: number
  customerLimit: number | null
  customerRemaining: number | null
  overIssuedLimit: boolean
  overCustomerLimit: boolean
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

function createdAtTime(value: string | null | undefined) {
  if (!value) return 0
  const t = new Date(value).getTime()
  return Number.isNaN(t) ? 0 : t
}

function normalizeKeyword(raw: string | undefined) {
  return String(raw ?? '').trim().slice(0, 100)
}

function normalizePlan(raw: string | undefined): 'all' | PlanKey {
  if (raw === 'free' || raw === 'starter' || raw === 'standard') return raw
  return 'all'
}

function normalizeOnlyOver(raw: string | undefined) {
  return raw === '1' ? '1' : '0'
}

function planLimits(planKey: PlanKey) {
  if (planKey === 'starter') {
    return {
      issuedLimit: 30,
      customerLimit: null,
    }
  }

  if (planKey === 'standard') {
    return {
      issuedLimit: null,
      customerLimit: null,
    }
  }

  return {
    issuedLimit: 5,
    customerLimit: 10,
  }
}

function planBadgeStyle(planKey: PlanKey): React.CSSProperties {
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

function overLimitBadgeStyle(): React.CSSProperties {
  return {
    background: '#fee2e2',
    color: '#991b1b',
    border: '1px solid #fca5a5',
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

  if (status === 'past_due' || status === 'unpaid') {
    return {
      background: '#fffbeb',
      color: '#92400e',
      border: '1px solid #fde68a',
    }
  }

  if (status === 'canceled' || status === 'cancelled') {
    return {
      background: '#fee2e2',
      color: '#991b1b',
      border: '1px solid #fca5a5',
    }
  }

  return {
    background: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
  }
}

function formatLimitValue(value: number | null) {
  return value == null ? '無制限' : String(value)
}

function formatRemainingValue(value: number | null) {
  return value == null ? '∞' : String(value)
}

export default async function AdminUsagePage({ searchParams }: Props) {
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
  const onlyOver = normalizeOnlyOver(resolvedSearchParams.onlyOver)

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
            利用状況
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

  const [subscriptionsRes, documentsRes, customersRes] = await Promise.all([
    adminSupabase
      .from('subscriptions')
      .select('org_id, plan_key, stripe_status, updated_at')
      .limit(1000),

    adminSupabase
      .from('documents')
      .select('org_id, status')
      .eq('status', 'issued')
      .limit(10000),

    adminSupabase
      .from('customers')
      .select('org_id')
      .limit(10000),
  ])

  const subscriptionsError = subscriptionsRes.error
  const documentsError = documentsRes.error
  const customersError = customersRes.error

  const subscriptions = (subscriptionsRes.data ?? []) as SubscriptionRow[]
  const documents = (documentsRes.data ?? []) as DocumentRow[]
  const customers = (customersRes.data ?? []) as CustomerRow[]

  const subscriptionMap = new Map<string, SubscriptionRow>()
  for (const row of subscriptions) {
    subscriptionMap.set(row.org_id, row)
  }

  const issuedCountMap = new Map<string, number>()
  for (const row of documents) {
    const orgId = String(row.org_id ?? '')
    if (!orgId) continue
    issuedCountMap.set(orgId, (issuedCountMap.get(orgId) ?? 0) + 1)
  }

  const customerCountMap = new Map<string, number>()
  for (const row of customers) {
    const orgId = String(row.org_id ?? '')
    if (!orgId) continue
    customerCountMap.set(orgId, (customerCountMap.get(orgId) ?? 0) + 1)
  }

  const orgIds = new Set<string>()
  for (const row of subscriptions) orgIds.add(row.org_id)
  for (const row of documents) orgIds.add(row.org_id)
  for (const row of customers) orgIds.add(row.org_id)

  const rows: UsageRow[] = [...orgIds].map((orgId) => {
    const subscription = subscriptionMap.get(orgId)
    const rawPlanKey = String(subscription?.plan_key ?? 'free')
    const planKey: PlanKey =
      rawPlanKey === 'starter' || rawPlanKey === 'standard' ? rawPlanKey : 'free'

    const { issuedLimit, customerLimit } = planLimits(planKey)

    const issuedCount = issuedCountMap.get(orgId) ?? 0
    const customerCount = customerCountMap.get(orgId) ?? 0

    const issuedRemaining =
      issuedLimit == null ? null : Math.max(issuedLimit - issuedCount, 0)

    const customerRemaining =
      customerLimit == null ? null : Math.max(customerLimit - customerCount, 0)

    const overIssuedLimit =
      issuedLimit != null ? issuedCount > issuedLimit : false

    const overCustomerLimit =
      customerLimit != null ? customerCount > customerLimit : false

    return {
      orgId,
      planKey,
      stripeStatus: subscription?.stripe_status ?? null,
      updatedAt: subscription?.updated_at ?? null,
      issuedCount,
      issuedLimit,
      issuedRemaining,
      customerCount,
      customerLimit,
      customerRemaining,
      overIssuedLimit,
      overCustomerLimit,
    }
  })

  const filteredRows = rows
    .filter((row) => {
      if (plan !== 'all' && row.planKey !== plan) return false
      if (onlyOver === '1' && !row.overIssuedLimit && !row.overCustomerLimit) {
        return false
      }

      if (!q) return true

      const haystack = [
        row.orgId,
        row.planKey,
        row.stripeStatus ?? '',
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(q.toLowerCase())
    })
    .sort((a, b) => {
      const aOver = a.overIssuedLimit || a.overCustomerLimit ? 1 : 0
      const bOver = b.overIssuedLimit || b.overCustomerLimit ? 1 : 0

      if (aOver !== bOver) return bOver - aOver
      return createdAtTime(b.updatedAt) - createdAtTime(a.updatedAt)
    })

  const totalOrgCount = rows.length
  const overLimitOrgCount = rows.filter(
    (row) => row.overIssuedLimit || row.overCustomerLimit
  ).length
  const freeCount = rows.filter((row) => row.planKey === 'free').length
  const starterCount = rows.filter((row) => row.planKey === 'starter').length
  const standardCount = rows.filter((row) => row.planKey === 'standard').length

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
            利用状況
          </h1>
          <p style={{ margin: 0, color: '#4b5563', lineHeight: 1.6 }}>
            組織ごとの発行件数・顧客数と、プラン上限の状況を確認するページです。
          </p>
        </div>
      </section>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div style={cardStyle()}>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
            組織総数
          </div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{totalOrgCount}</div>
        </div>

        <div style={cardStyle()}>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
            上限超過あり
          </div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{overLimitOrgCount}</div>
        </div>

        <div style={cardStyle()}>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
            Free
          </div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{freeCount}</div>
        </div>

        <div style={cardStyle()}>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
            Starter / Standard
          </div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>
            {starterCount + standardCount}
          </div>
        </div>
      </section>

      <section style={{ ...cardStyle(), marginBottom: 16 }}>
        <form
          method="get"
          style={{
            display: 'grid',
            gridTemplateColumns: '180px minmax(240px, 1fr) auto auto',
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
              placeholder="org_id / plan / stripe_status"
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

          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              height: 40,
              fontSize: 14,
            }}
          >
            <input
              type="checkbox"
              name="onlyOver"
              value="1"
              defaultChecked={onlyOver === '1'}
            />
            上限超過のみ
          </label>

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
              href="/admin/usage"
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

      {(subscriptionsError || documentsError || customersError) ? (
        <section style={{ ...cardStyle(), marginBottom: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>補足</div>
          <div style={{ fontSize: 13, color: '#92400e', lineHeight: 1.8 }}>
            {subscriptionsError ? `subscriptions取得エラー: ${subscriptionsError.message}` : null}
            {subscriptionsError && (documentsError || customersError) ? <br /> : null}
            {documentsError ? `documents取得エラー: ${documentsError.message}` : null}
            {documentsError && customersError ? <br /> : null}
            {customersError ? `customers取得エラー: ${customersError.message}` : null}
          </div>
        </section>
      ) : null}

      <section style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, color: '#6b7280' }}>
          {filteredRows.length}件を表示中
        </div>
      </section>

      {filteredRows.length === 0 ? (
        <section style={cardStyle()}>
          <div
            style={{
              border: '1px dashed #d1d5db',
              borderRadius: 12,
              padding: 20,
              color: '#6b7280',
            }}
          >
            条件に一致する組織はありません。
          </div>
        </section>
      ) : (
        <section style={{ display: 'grid', gap: 12 }}>
          {filteredRows.map((row) => {
            const overLimit = row.overIssuedLimit || row.overCustomerLimit

            return (
              <article
                key={row.orgId}
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
                      org_id: {row.orgId}
                    </div>
                    <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>
                      updated_at: {formatDateTime(row.updatedAt)}
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
                        ...planBadgeStyle(row.planKey),
                      }}
                    >
                      {row.planKey}
                    </div>

                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '4px 10px',
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 700,
                        ...stripeStatusBadgeStyle(row.stripeStatus),
                      }}
                    >
                      {row.stripeStatus ?? '-'}
                    </div>

                    {overLimit ? (
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '4px 10px',
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 700,
                          ...overLimitBadgeStyle(),
                        }}
                      >
                        上限超過あり
                      </div>
                    ) : null}
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: 10,
                    fontSize: 14,
                    color: '#374151',
                  }}
                >
                  <div>
                    <strong>発行件数:</strong> {row.issuedCount}
                  </div>
                  <div>
                    <strong>発行上限:</strong> {formatLimitValue(row.issuedLimit)}
                  </div>
                  <div>
                    <strong>発行残り:</strong> {formatRemainingValue(row.issuedRemaining)}
                  </div>

                  <div>
                    <strong>顧客数:</strong> {row.customerCount}
                  </div>
                  <div>
                    <strong>顧客上限:</strong> {formatLimitValue(row.customerLimit)}
                  </div>
                  <div>
                    <strong>顧客残り:</strong> {formatRemainingValue(row.customerRemaining)}
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