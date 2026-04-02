import type { SupabaseClient } from '@supabase/supabase-js'
import { getOrgPlan } from './getOrgPlan'
import { PLAN_LIMITS, getPlanLabel, type LimitType, type PlanKey } from './planLimits'
import { getUsageRow } from './usage'

export class PlanLimitError extends Error {
  status: number
  code: string
  plan: PlanKey
  limitType: LimitType

  constructor(plan: PlanKey, limitType: LimitType, message: string) {
    super(message)
    this.name = 'PlanLimitError'
    this.status = 403
    this.code = 'plan_limit_reached'
    this.plan = plan
    this.limitType = limitType
  }
}

export function toPlanLimitJson(err: PlanLimitError) {
  return {
    ok: false,
    error: err.code,
    message: err.message,
    plan: err.plan,
    limit_type: err.limitType,
  }
}

export async function assertCanIssueDocument(
  supabase: SupabaseClient,
  orgId: string
) {
  const plan = await getOrgPlan(supabase, orgId)
  const limit = PLAN_LIMITS[plan].monthlyIssues

  if (limit == null) {
    return { plan, remaining: null as number | null }
  }

  const usage = await getUsageRow(supabase, orgId)
  const used = usage?.issued_count ?? 0

  if (used >= limit) {
    throw new PlanLimitError(
      plan,
      'monthly_issues',
      `${getPlanLabel(plan)}の月間発行上限に達しました。Starterプラン以上をご利用ください。`
    )
  }

  return { plan, remaining: limit - used }
}

export async function assertCanSavePdfHistory(
  supabase: SupabaseClient,
  orgId: string,
  currentHistoryCount: number
) {
  const plan = await getOrgPlan(supabase, orgId)
  const limit = PLAN_LIMITS[plan].maxSavedPdfHistory

  if (limit == null) {
    return { plan, remaining: null as number | null }
  }

  if (currentHistoryCount >= limit) {
    throw new PlanLimitError(
      plan,
      'saved_pdf_history',
      `${getPlanLabel(plan)}のPDF履歴保存上限に達しました。Starterプラン以上をご利用ください。`
    )
  }

  return { plan, remaining: limit - currentHistoryCount }
}

export async function assertCanCreateCustomer(
  supabase: SupabaseClient,
  orgId: string,
  currentCustomerCount: number
) {
  const plan = await getOrgPlan(supabase, orgId)
  const limit = PLAN_LIMITS[plan].maxCustomers

  if (limit == null) {
    return { plan, remaining: null as number | null }
  }

  if (currentCustomerCount >= limit) {
    throw new PlanLimitError(
      plan,
      'customer_count',
      `${getPlanLabel(plan)}の顧客登録上限に達しました。Starterプラン以上をご利用ください。`
    )
  }

  return { plan, remaining: limit - currentCustomerCount }
}

export async function assertCanUseBranding(
  supabase: SupabaseClient,
  orgId: string
) {
  const plan = await getOrgPlan(supabase, orgId)
  const enabled = PLAN_LIMITS[plan].brandingEnabled

  if (!enabled) {
    throw new PlanLimitError(
      plan,
      'branding_locked',
      'ブランド設定はStarterプラン以上で利用できます。'
    )
  }

  return { plan }
}