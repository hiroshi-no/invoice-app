import type { NextRequest } from 'next/server'

import { createSupabaseServerClient } from '@/lib/api/supabase-server'
import { getCurrentOrgIdForUser } from '@/lib/org/getCurrentOrgId'

type AdminRole = 'owner' | 'admin'

type CookieToSet = {
  name: string
  value: string
  options?: any
}

export type AdminContextFromRequest =
  | {
      ok: false
      reason: 'unauthorized' | 'forbidden'
      cookiesToSet: CookieToSet[]
    }
  | {
      ok: true
      supabase: any
      user: any
      orgId: string
      role: AdminRole
      cookiesToSet: CookieToSet[]
    }

const isAdminRole = (role: unknown): role is AdminRole =>
  role === 'owner' || role === 'admin'

export async function getAdminContextFromRequest(
  req: NextRequest
): Promise<AdminContextFromRequest> {
  const { supabase, cookiesToSet } = createSupabaseServerClient(req)

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      ok: false,
      reason: 'unauthorized',
      cookiesToSet,
    }
  }

  const orgId = await getCurrentOrgIdForUser(supabase as any, user.id)

  if (!orgId) {
    return {
      ok: false,
      reason: 'forbidden',
      cookiesToSet,
    }
  }

  const { data: membership, error: membershipError } = await supabase
    .from('organization_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (membershipError) {
    return {
      ok: false,
      reason: 'forbidden',
      cookiesToSet,
    }
  }

  const role = String((membership as any)?.role ?? '')

  if (!isAdminRole(role)) {
    return {
      ok: false,
      reason: 'forbidden',
      cookiesToSet,
    }
  }

  return {
    ok: true,
    supabase,
    user,
    orgId,
    role,
    cookiesToSet,
  }
}