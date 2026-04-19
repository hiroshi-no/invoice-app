import Link from 'next/link'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getAdminContext } from '@/lib/authz/getAdminContext'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type SearchParams = {
  q?: string
}

type Props = {
  searchParams?: Promise<SearchParams> | SearchParams
}

type ProfileRow = {
  user_id: string
  current_org_id: string | null
}

type MembershipRow = {
  user_id: string
  org_id: string
  role: string
}

type AdminUserRow = {
  userId: string
  email: string | null
  createdAt: string | null
  currentOrgId: string | null
  currentRole: string | null
}

function cardStyle(): React.CSSProperties {
  return {
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    background: '#fff',
    padding: 16,
  }
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

function normalizeKeyword(raw: string | undefined) {
  return String(raw ?? '').trim().slice(0, 100)
}

function createdAtTime(value: string | null) {
  if (!value) return 0
  const t = new Date(value).getTime()
  return Number.isNaN(t) ? 0 : t
}

export default async function AdminUsersPage({ searchParams }: Props) {
  const ctx = await getAdminContext()

  if (!ctx.ok) {
    return null
  }

  const resolvedSearchParams =
    searchParams && typeof (searchParams as any)?.then === 'function'
      ? await (searchParams as Promise<SearchParams>)
      : (searchParams ?? {})

  const q = normalizeKeyword(resolvedSearchParams.q)

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
            ユーザー確認
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

  const { data: usersRes, error: usersError } =
    await adminSupabase.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    })

  if (usersError) {
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
            ユーザー確認
          </h1>
          <div style={{ color: '#991b1b', lineHeight: 1.8 }}>
            ユーザー一覧の取得に失敗しました。時間をおいて再試行してください。
          </div>
          <div style={{ marginTop: 8, fontSize: 13, color: '#6b7280' }}>
            detail: {usersError.message}
          </div>
        </section>
      </main>
    )
  }

  const authUsers = usersRes?.users ?? []
  const userIds = authUsers.map((u: any) => String(u.id)).filter(Boolean)

  let profiles: ProfileRow[] = []
  let memberships: MembershipRow[] = []
  let profileErrorMessage = ''
  let membershipErrorMessage = ''

  if (userIds.length > 0) {
    const [profilesRes, membershipsRes] = await Promise.all([
      adminSupabase
        .from('profiles')
        .select('user_id, current_org_id')
        .in('user_id', userIds),

      adminSupabase
        .from('organization_members')
        .select('user_id, org_id, role')
        .in('user_id', userIds),
    ])

    profiles = (profilesRes.data ?? []) as ProfileRow[]
    memberships = (membershipsRes.data ?? []) as MembershipRow[]

    if (profilesRes.error) {
      profileErrorMessage = profilesRes.error.message
    }

    if (membershipsRes.error) {
      membershipErrorMessage = membershipsRes.error.message
    }
  }

  const profileMap = new Map<string, ProfileRow>()
  for (const row of profiles) {
    profileMap.set(row.user_id, row)
  }

  const membershipMap = new Map<string, MembershipRow>()
  for (const row of memberships) {
    membershipMap.set(`${row.user_id}:${row.org_id}`, row)
  }

  const mergedRows: AdminUserRow[] = authUsers.map((user: any) => {
    const userId = String(user.id)
    const profile = profileMap.get(userId) ?? null
    const currentOrgId = profile?.current_org_id ?? null
    const membership = currentOrgId
      ? membershipMap.get(`${userId}:${currentOrgId}`) ?? null
      : null

    return {
      userId,
      email: user.email ?? null,
      createdAt: user.created_at ?? null,
      currentOrgId,
      currentRole: membership?.role ?? null,
    }
  })

  const filteredRows = mergedRows
    .filter((row) => {
      if (!q) return true
      const haystack = [
        row.email ?? '',
        row.userId,
        row.currentOrgId ?? '',
        row.currentRole ?? '',
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(q.toLowerCase())
    })
    .sort((a, b) => createdAtTime(b.createdAt) - createdAtTime(a.createdAt))

  const linkedProfileCount = mergedRows.filter((row) => !!row.currentOrgId).length
  const adminLikeCount = mergedRows.filter(
    (row) => row.currentRole === 'owner' || row.currentRole === 'admin'
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
            ユーザー確認
          </h1>
          <p style={{ margin: 0, color: '#4b5563', lineHeight: 1.6 }}>
            ユーザー、現在の組織、権限の確認ページです。
          </p>
        </div>
      </section>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div style={cardStyle()}>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
            ユーザー総数
          </div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>
            {mergedRows.length}
          </div>
        </div>

        <div style={cardStyle()}>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
            profiles 連携あり
          </div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>
            {linkedProfileCount}
          </div>
        </div>

        <div style={cardStyle()}>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
            owner / admin
          </div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>
            {adminLikeCount}
          </div>
        </div>
      </section>

      <section style={{ ...cardStyle(), marginBottom: 16 }}>
        <form
          method="get"
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(240px, 1fr) auto',
            gap: 12,
            alignItems: 'end',
          }}
        >
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
              placeholder="email / user_id / org_id / role"
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
              検索
            </button>

            <Link
              href="/admin/users"
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

      {profileErrorMessage || membershipErrorMessage ? (
        <section style={{ ...cardStyle(), marginBottom: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>補足</div>
          <div style={{ fontSize: 13, color: '#92400e', lineHeight: 1.8 }}>
            {profileErrorMessage ? `profiles取得エラー: ${profileErrorMessage}` : null}
            {profileErrorMessage && membershipErrorMessage ? <br /> : null}
            {membershipErrorMessage
              ? `organization_members取得エラー: ${membershipErrorMessage}`
              : null}
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
            条件に一致するユーザーはありません。
          </div>
        </section>
      ) : (
        <section style={{ display: 'grid', gap: 12 }}>
          {filteredRows.map((row) => {
            const role =
              row.currentRole === 'owner'
                ? 'owner'
                : row.currentRole === 'admin'
                ? 'admin'
                : row.currentRole === 'member'
                ? 'member'
                : '-'

            const roleStyle: React.CSSProperties =
              row.currentRole === 'owner'
                ? {
                    background: '#ede9fe',
                    color: '#6d28d9',
                    border: '1px solid #c4b5fd',
                  }
                : row.currentRole === 'admin'
                ? {
                    background: '#dbeafe',
                    color: '#1d4ed8',
                    border: '1px solid #93c5fd',
                  }
                : row.currentRole === 'member'
                ? {
                    background: '#f3f4f6',
                    color: '#374151',
                    border: '1px solid #d1d5db',
                  }
                : {
                    background: '#fff',
                    color: '#6b7280',
                    border: '1px solid #e5e7eb',
                  }

            return (
              <article
                key={row.userId}
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
                      {row.email || 'メールなし'}
                    </div>
                    <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>
                      user_id: {row.userId}
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '4px 10px',
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 700,
                      ...roleStyle,
                    }}
                  >
                    {role}
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
                    <strong>現在の org:</strong> {row.currentOrgId || '-'}
                  </div>
                  <div>
                    <strong>作成日時:</strong> {formatDateTime(row.createdAt)}
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