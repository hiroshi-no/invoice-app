// lib/org/getCurrentOrgId.ts
import type { SupabaseClient } from '@supabase/supabase-js'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type RequireCurrentOrgOk = {
  ok: true
  userId: string
  orgId: string
}

type RequireCurrentOrgErr = {
  ok: false
  status: number
  body: {
    error: string
    message: string
    detail?: string
  }
}

export type RequireCurrentOrgResult = RequireCurrentOrgOk | RequireCurrentOrgErr

export async function getCurrentOrgIdForUser(
  supabase: SupabaseClient<any, any, any>,
  userId: string
) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('current_org_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    return { orgId: null, error }
  }

  const orgId = String((profile as any)?.current_org_id ?? '')
  if (!UUID_RE.test(orgId)) {
    return { orgId: null, error: null }
  }

  return { orgId, error: null }
}

// 互換用: 既存コード向け
export async function getCurrentOrgId(
  supabase: SupabaseClient<any, any, any>,
  userId: string
) {
  const { orgId, error } = await getCurrentOrgIdForUser(supabase, userId)

  if (error) {
    throw error
  }

  if (!orgId) {
    throw new Error('current org not set')
  }

  return orgId
}

export async function requireCurrentOrgId(
  supabase: SupabaseClient<any, any, any>
): Promise<RequireCurrentOrgResult> {
  const { data: userData, error: userErr } = await supabase.auth.getUser()

  if (userErr || !userData.user) {
    return {
      ok: false,
      status: 401,
      body: {
        error: 'not_authenticated',
        message: 'ログインが切れました。再ログインしてください。',
        detail: userErr?.message,
      },
    }
  }

  const userId = userData.user.id
  const { orgId, error: profileErr } = await getCurrentOrgIdForUser(supabase, userId)

  if (profileErr) {
    return {
      ok: false,
      status: 500,
      body: {
        error: 'profile_fetch_failed',
        message: 'プロフィール情報の取得に失敗しました。時間をおいて再実行してください。',
        detail: profileErr.message,
      },
    }
  }

  if (!orgId) {
    return {
      ok: false,
      status: 409,
      body: {
        error: 'current_org_not_set',
        message:
          '現在のワークスペースが未設定です。プロフィール初期化を再実行してください。',
        detail: 'profiles.current_org_id is missing',
      },
    }
  }

  return {
    ok: true,
    userId,
    orgId,
  }
}