import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type Stripe from 'stripe'

import { getOrgPlan } from '@/lib/billing/getOrgPlan'
import { getCurrentOrgIdForUser } from '@/lib/org/getCurrentOrgId'
import { getStripeServer } from '@/lib/stripe/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type PlanKey = 'free' | 'starter' | 'standard'

function getJstYearMonth(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(date)

  const year = parts.find((p) => p.type === 'year')?.value ?? '0000'
  const month = parts.find((p) => p.type === 'month')?.value ?? '01'
  return `${year}-${month}`
}

function getUiLimits(planKey: PlanKey) {
  switch (planKey) {
    case 'free':
      return {
        issuedLimit: 5,
        savedPdfLimit: 30,
        customerLimit: 10,
        brandingEnabled: false,
      }
    case 'starter':
      return {
        issuedLimit: 30,
        savedPdfLimit: 100,
        customerLimit: null,
        brandingEnabled: true,
      }
    case 'standard':
      return {
        issuedLimit: null,
        savedPdfLimit: null,
        customerLimit: null,
        brandingEnabled: true,
      }
  }
}

async function getCookieStore() {
  const c: any = cookies()
  return typeof c?.then === 'function' ? await c : c
}

async function createSupabase() {
  const cookieStore = await getCookieStore()

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll().map((c: any) => ({
          name: c.name,
          value: c.value,
        }))
      },
      setAll() {
        // read only
      },
    },
  })
}

function toIsoOrNull(v: any) {
  if (!v) return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

function unixToIso(v: number | null | undefined) {
  if (!v || !Number.isFinite(v)) return null
  return new Date(v * 1000).toISOString()
}

function getStripeFlexibleBillingModeType(subscription: Stripe.Subscription | null | undefined) {
  const raw = subscription as any
  return String(raw?.billing_mode?.type ?? '').toLowerCase()
}

function getStripeCurrentPeriodEndIso(subscription: Stripe.Subscription | null | undefined) {
  if (!subscription) return null

  const raw = subscription as any

  if (typeof raw?.current_period_end === 'number' && Number.isFinite(raw.current_period_end)) {
    return unixToIso(raw.current_period_end)
  }

  const firstItem = subscription.items?.data?.[0] ?? null
  const itemCurrentPeriodEnd = (firstItem as any)?.current_period_end

  if (typeof itemCurrentPeriodEnd === 'number' && Number.isFinite(itemCurrentPeriodEnd)) {
    return unixToIso(itemCurrentPeriodEnd)
  }

  return null
}

function getStripeScheduledCancelAtIso(subscription: Stripe.Subscription | null | undefined) {
  if (!subscription) return null

  const raw = subscription as any

  if (typeof raw?.cancel_at === 'number' && Number.isFinite(raw.cancel_at)) {
    return unixToIso(raw.cancel_at)
  }

  return getStripeCurrentPeriodEndIso(subscription)
}

function isStripeScheduledForCancel(subscription: Stripe.Subscription | null | undefined) {
  if (!subscription) return false
  if (subscription.cancel_at_period_end) return true

  const raw = subscription as any
  return (
    getStripeFlexibleBillingModeType(subscription) === 'flexible' &&
    typeof raw?.cancel_at === 'number' &&
    Number.isFinite(raw.cancel_at)
  )
}

export async function GET() {
  try {
    const supabase = await createSupabase()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
    }

    const orgId = await getCurrentOrgIdForUser(supabase as any, user.id)

    if (!orgId) {
      return NextResponse.json({ ok: false, error: 'current_org_not_found' }, { status: 400 })
    }

    const rawPlan = await getOrgPlan(supabase as any, orgId)
    const planKey: PlanKey =
      typeof rawPlan === 'string'
        ? (rawPlan as PlanKey)
        : ((rawPlan as any)?.planKey ?? 'free')

    const yearMonth = getJstYearMonth()
    const limits = getUiLimits(planKey)

    const [{ data: usage }, { count: customerCount }, { data: subscription }] = await Promise.all([
      supabase
        .from('usage_counters')
        .select('issued_count,saved_pdf_count')
        .eq('org_id', orgId)
        .eq('year_month', yearMonth)
        .maybeSingle(),
      supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId),
      supabase
        .from('subscriptions')
        .select(
          'stripe_status,current_period_end,cancel_at_period_end,stripe_subscription_id'
        )
        .eq('org_id', orgId)
        .maybeSingle(),
    ])

    const issuedCount = usage?.issued_count ?? 0
    const savedPdfCount = usage?.saved_pdf_count ?? 0
    const currentCustomerCount = customerCount ?? 0

    const issuedRemaining =
      limits.issuedLimit == null ? null : Math.max(limits.issuedLimit - issuedCount, 0)

    const savedPdfRemaining =
      limits.savedPdfLimit == null ? null : Math.max(limits.savedPdfLimit - savedPdfCount, 0)

    const customerRemaining =
      limits.customerLimit == null
        ? null
        : Math.max(limits.customerLimit - currentCustomerCount, 0)

    let stripeStatus: string | null = subscription?.stripe_status ?? null
    let currentPeriodEnd: string | null = toIsoOrNull(subscription?.current_period_end ?? null)
    let cancelAtPeriodEnd = Boolean(subscription?.cancel_at_period_end)
    let scheduledCancelAt: string | null = cancelAtPeriodEnd ? currentPeriodEnd : null
    const stripeSubscriptionId = String(subscription?.stripe_subscription_id ?? '').trim()

    // Stripe を正本として補正
    if (stripeSubscriptionId) {
      try {
        const stripe = getStripeServer()
        const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId)

        stripeStatus = String(stripeSub.status ?? '').toLowerCase() || stripeStatus

        const stripeCancelScheduled = isStripeScheduledForCancel(stripeSub)
        const stripeResolvedCurrentPeriodEnd = getStripeCurrentPeriodEndIso(stripeSub)
        const stripeResolvedScheduledCancelAt = stripeCancelScheduled
          ? getStripeScheduledCancelAtIso(stripeSub)
          : null

        cancelAtPeriodEnd = stripeCancelScheduled

        if (stripeResolvedCurrentPeriodEnd) {
          currentPeriodEnd = stripeResolvedCurrentPeriodEnd
        }

        scheduledCancelAt = stripeResolvedScheduledCancelAt
      } catch (e) {
        console.error('[billing-summary] stripe retrieve failed', {
          orgId,
          stripeSubscriptionId,
          message: e instanceof Error ? e.message : String(e),
        })
      }
    }

    return NextResponse.json({
      ok: true,
      billing: {
        planKey,
        yearMonth,
        issuedCount,
        savedPdfCount,
        issuedLimit: limits.issuedLimit,
        issuedRemaining,
        savedPdfLimit: limits.savedPdfLimit,
        savedPdfRemaining,
        customerCount: currentCustomerCount,
        customerLimit: limits.customerLimit,
        customerRemaining,
        brandingEnabled: limits.brandingEnabled,
        stripeStatus,
        currentPeriodEnd,
        cancelAtPeriodEnd,
        scheduledCancelAt,
      },
    })
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: 'billing_summary_failed',
        detail: process.env.NODE_ENV !== 'production' ? String(e?.message ?? e) : undefined,
      },
      { status: 500 }
    )
  }
}