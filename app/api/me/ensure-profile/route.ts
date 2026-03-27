import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

async function getCookieStore() {
  const c: any = cookies()
  return typeof c?.then === 'function' ? await c : c
}

function json(body: any, init?: ResponseInit) {
  return NextResponse.json(body, init)
}

async function createSupabaseUserClient() {
  const cookieStore = await getCookieStore()

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!url || !anonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll().map((c: any) => ({
          name: c.name,
          value: c.value,
        }))
      },
      setAll(_cookiesToSet) {
        // この route では auth cookie 更新は不要なので no-op
      },
    },
  })
}

function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRole) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
  }

  return createAdminClient(url, serviceRole, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

function buildDefaultOrgName(email?: string | null) {
  const local = String(email ?? '')
    .split('@')[0]
    .trim()

  if (!local) return 'マイワークスペース'
  return `${local} のワークスペース`
}

async function findExistingOrganization(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  userId: string
) {
  const { data, error } = await admin
    .from('organizations')
    .select('id')
    .eq('owner_user_id', userId)
    .maybeSingle()

  if (error) throw error
  return data?.id ? String(data.id) : null
}

async function createOrganization(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  user: any
) {
  const orgName = buildDefaultOrgName(user?.email)

  const { data, error } = await admin
    .from('organizations')
    .insert({
      owner_user_id: user.id,
      name: orgName,
    })
    .select('id')
    .single()

  if (error || !data?.id) {
    throw error ?? new Error('Failed to create organization')
  }

  return String(data.id)
}

export async function POST() {
  try {
    const supabase = await createSupabaseUserClient()
    const admin = createSupabaseAdminClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return json(
        {
          ok: false,
          error: 'not_authenticated',
          message: 'ログイン情報を確認できませんでした。',
        },
        { status: 401 }
      )
    }

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('user_id, current_org_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (profileError) {
      return json(
        {
          ok: false,
          error: 'profile_read_failed',
          message: profileError.message,
        },
        { status: 500 }
      )
    }

    const currentOrgId = String((profile as any)?.current_org_id ?? '')

    if (UUID_RE.test(currentOrgId)) {
      return json({
        ok: true,
        created: false,
        org_id: currentOrgId,
      })
    }

    let orgId: string | null = null

    try {
      orgId = await findExistingOrganization(admin, user.id)
    } catch (e: any) {
      return json(
        {
          ok: false,
          error: 'organization_read_failed',
          message: String(e?.message ?? e ?? 'unknown error'),
        },
        { status: 500 }
      )
    }

    if (!orgId) {
      orgId = await createOrganization(admin, user)
    }

    const { error: upsertError } = await admin.from('profiles').upsert(
      {
        user_id: user.id,
        current_org_id: orgId,
      },
      {
        onConflict: 'user_id',
      }
    )

    if (upsertError) {
      return json(
        {
          ok: false,
          error: 'profile_upsert_failed',
          message: upsertError.message,
        },
        { status: 500 }
      )
    }

    return json({
      ok: true,
      created: true,
      org_id: orgId,
    })
  } catch (e: any) {
    return json(
      {
        ok: false,
        error: 'ensure_profile_failed',
        message: String(e?.message ?? e ?? 'unknown error'),
      },
      { status: 500 }
    )
  }
}