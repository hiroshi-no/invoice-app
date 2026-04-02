import type { SupabaseClient } from '@supabase/supabase-js'
import type { PlanKey } from './planLimits'

type SubscriptionRow = {
  plan_key: string | null
  status: string | null
}

export async function getOrgPlan(
  supabase: SupabaseClient,
  orgId: string
): Promise<PlanKey> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('plan_key, status')
    .eq('org_id', orgId)
    .maybeSingle<SubscriptionRow>()

  if (error) throw error

  if (!data) return 'free'
  if (data.status === 'canceled') return 'free'

  if (data.plan_key === 'starter') return 'starter'
  if (data.plan_key === 'standard') return 'standard'
  return 'free'
}