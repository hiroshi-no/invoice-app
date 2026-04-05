export type StripePlanKey = 'free' | 'starter' | 'standard'

export function getStripePriceId(planKey: Exclude<StripePlanKey, 'free'>) {
  if (planKey === 'starter') {
    const priceId = process.env.STRIPE_PRICE_STARTER_MONTHLY
    if (!priceId) throw new Error('Missing STRIPE_PRICE_STARTER_MONTHLY')
    return priceId
  }

  const priceId = process.env.STRIPE_PRICE_STANDARD_MONTHLY
  if (!priceId) throw new Error('Missing STRIPE_PRICE_STANDARD_MONTHLY')
  return priceId
}

export function getPlanKeyFromPriceId(priceId: string | null | undefined): StripePlanKey {
  if (!priceId) return 'free'
  if (priceId === process.env.STRIPE_PRICE_STARTER_MONTHLY) return 'starter'
  if (priceId === process.env.STRIPE_PRICE_STANDARD_MONTHLY) return 'standard'
  return 'free'
}

export function isPaidPlanKey(planKey: string): planKey is Exclude<StripePlanKey, 'free'> {
  return planKey === 'starter' || planKey === 'standard'
}