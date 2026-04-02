export type PlanKey = 'free' | 'starter' | 'standard'

export type LimitType =
  | 'monthly_issues'
  | 'customer_count'
  | 'saved_pdf_history'
  | 'branding_locked'

export const PLAN_LIMITS = {
  free: {
    monthlyIssues: 5,
    maxCustomers: 10,
    maxSavedPdfHistory: 5,
    brandingEnabled: false,
  },
  starter: {
    monthlyIssues: 30,
    maxCustomers: null,
    maxSavedPdfHistory: 100,
    brandingEnabled: true,
  },
  standard: {
    monthlyIssues: null,
    maxCustomers: null,
    maxSavedPdfHistory: null,
    brandingEnabled: true,
  },
} as const satisfies Record<
  PlanKey,
  {
    monthlyIssues: number | null
    maxCustomers: number | null
    maxSavedPdfHistory: number | null
    brandingEnabled: boolean
  }
>

export function getPlanLabel(plan: PlanKey) {
  switch (plan) {
    case 'free':
      return '無料プラン'
    case 'starter':
      return 'Starterプラン'
    case 'standard':
      return 'Standardプラン'
    default:
      return 'プラン'
  }
}