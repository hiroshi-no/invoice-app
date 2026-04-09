import { createClient } from '@/lib/supabase/server'
import { getCurrentOrgIdForUser } from '@/lib/org/getCurrentOrgId'

type AdminRole = 'owner' | 'admin'

export type AdminContext =
  | { ok: false; reason: 'unauthorized' | 'forbidden' }
  | {
      ok: true
      supabase: any
      user: any
      orgId: string
      role: AdminRole
    }

export async function getAdminContext(): Promise<AdminContext> {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { ok: false, reason: 'unauthorized' }
  }

  const orgId = await getCurrentOrgIdForUser(supabase as any, user.id)

  if (!orgId) {
    return { ok: false, reason: 'forbidden' }
  }

  const { data: membership, error: membershipError } = await supabase
    .from('organization_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (membershipError) {
    return { ok: false, reason: 'forbidden' }
  }

  if (membership?.role !== 'owner' && membership?.role !== 'admin') {
    return { ok: false, reason: 'forbidden' }
  }

  return {
    ok: true,
    supabase,
    user,
    orgId,
    role: membership.role,
  }
}