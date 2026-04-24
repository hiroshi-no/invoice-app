import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'

import { getStripeServer } from '@/lib/stripe/server'
import { getPlanKeyFromPriceId } from '@/lib/stripe/plans'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function createAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

function nowIso() {
  return new Date().toISOString()
}

function unixToIso(v: number | null | undefined) {
  if (!v || !Number.isFinite(v)) return null
  return new Date(v * 1000).toISOString()
}

function normalizeStripeId(value: unknown): string | null {
  if (!value) return null
  if (typeof value === 'string') return value

  if (typeof value === 'object' && value !== null && 'id' in value) {
    const id = (value as any).id
    return typeof id === 'string' ? id : null
  }

  return null
}

function isEntitledStripeStatus(status: string | null | undefined) {
  const s = String(status ?? '').toLowerCase()
  return s === 'active' || s === 'trialing'
}

function getFlexibleBillingModeType(subscription: Stripe.Subscription) {
  const raw = subscription as any
  return String(raw?.billing_mode?.type ?? '').toLowerCase()
}

function getCurrentPeriodEndIso(subscription: Stripe.Subscription) {
  const raw = subscription as any

  if (typeof raw?.current_period_end === 'number' && Number.isFinite(raw.current_period_end)) {
    return unixToIso(raw.current_period_end)
  }

  const firstItem = subscription.items?.data?.[0] ?? null
  const itemCurrentPeriodEnd = (firstItem as any)?.current_period_end

  if (typeof itemCurrentPeriodEnd === 'number' && Number.isFinite(itemCurrentPeriodEnd)) {
    return unixToIso(itemCurrentPeriodEnd)
  }

  if (typeof raw?.cancel_at === 'number' && Number.isFinite(raw.cancel_at)) {
    return unixToIso(raw.cancel_at)
  }

  return null
}

function isScheduledForCancel(subscription: Stripe.Subscription) {
  if (subscription.cancel_at_period_end) return true

  const raw = subscription as any
  return (
    getFlexibleBillingModeType(subscription) === 'flexible' &&
    typeof raw?.cancel_at === 'number' &&
    Number.isFinite(raw.cancel_at)
  )
}

function mapAppSubscriptionStatus(
  eventType: string,
  stripeStatus: string | null | undefined
): 'active' | 'trialing' | 'past_due' | 'canceled' {
  if (eventType === 'customer.subscription.deleted') return 'canceled'

  const s = String(stripeStatus ?? '').toLowerCase()
  if (s === 'trialing') return 'trialing'
  if (s === 'past_due') return 'past_due'
  if (s === 'active') return 'active'

  return 'canceled'
}

async function markEventProcessed(
  supabase: ReturnType<typeof createAdminSupabase>,
  eventId: string,
  eventType: string
) {
  const { error } = await supabase
    .from('stripe_webhook_events')
    .insert({
      event_id: eventId,
      event_type: eventType,
    })

  if (!error) return { ok: true, duplicate: false as const }

  if (String((error as any)?.code ?? '') === '23505') {
    return { ok: true, duplicate: true as const }
  }

  throw new Error(error.message)
}

async function getExistingSubscriptionRow(
  supabase: ReturnType<typeof createAdminSupabase>,
  orgId: string
) {
  const { data, error } = await supabase
    .from('subscriptions')
    .select(
      'org_id, plan_key, status, stripe_customer_id, stripe_subscription_id, stripe_price_id, stripe_checkout_session_id, current_period_end, cancel_at_period_end, stripe_status'
    )
    .eq('org_id', orgId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data
}

async function upsertSubscriptionRow(
  supabase: ReturnType<typeof createAdminSupabase>,
  orgId: string,
  patch: Record<string, any>
) {
  const existing = await getExistingSubscriptionRow(supabase, orgId)

  const row = {
    org_id: orgId,
    plan_key: existing?.plan_key ?? 'free',
    status: existing?.status ?? 'active',
    stripe_customer_id: existing?.stripe_customer_id ?? null,
    stripe_subscription_id: existing?.stripe_subscription_id ?? null,
    stripe_price_id: existing?.stripe_price_id ?? null,
    stripe_checkout_session_id: existing?.stripe_checkout_session_id ?? null,
    current_period_end: existing?.current_period_end ?? null,
    cancel_at_period_end: existing?.cancel_at_period_end ?? false,
    stripe_status: existing?.stripe_status ?? null,
    updated_at: nowIso(),
    ...patch,
  }

  const { error } = await supabase.from('subscriptions').upsert(row, {
    onConflict: 'org_id',
  })

  if (error) throw new Error(error.message)
}

async function findOrgIdForSubscription(
  supabase: ReturnType<typeof createAdminSupabase>,
  subscription: Stripe.Subscription
) {
  const metadataOrgId = String(subscription.metadata?.org_id ?? '').trim()
  if (metadataOrgId) return metadataOrgId

  const subscriptionId = normalizeStripeId(subscription.id)
  if (subscriptionId) {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('org_id')
      .eq('stripe_subscription_id', subscriptionId)
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (data?.org_id) return data.org_id as string
  }

  const customerId = normalizeStripeId(subscription.customer)
  if (customerId) {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('org_id')
      .eq('stripe_customer_id', customerId)
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (data?.org_id) return data.org_id as string
  }

  return null
}

async function handleCheckoutCompleted(
  supabase: ReturnType<typeof createAdminSupabase>,
  session: Stripe.Checkout.Session,
  eventId: string
) {
  const orgId =
    String(session.client_reference_id ?? '').trim() ||
    String(session.metadata?.org_id ?? '').trim()

  if (!orgId) {
    return { ignored: true, reason: 'missing_org_id' as const }
  }

  const stripeCustomerId = normalizeStripeId(session.customer)
  const stripeSubscriptionId = normalizeStripeId(session.subscription)

  await upsertSubscriptionRow(supabase, orgId, {
    stripe_customer_id: stripeCustomerId,
    stripe_subscription_id: stripeSubscriptionId,
    stripe_checkout_session_id: session.id,
    last_stripe_event_id: eventId,
  })

  return { ignored: false as const }
}

async function handleSubscriptionChanged(
  supabase: ReturnType<typeof createAdminSupabase>,
  subscription: Stripe.Subscription,
  eventType: string,
  eventId: string
) {
  const orgId = await findOrgIdForSubscription(supabase, subscription)

  if (!orgId) {
    return { ignored: true, reason: 'org_not_found' as const }
  }

  const stripeCustomerId = normalizeStripeId(subscription.customer)
  const stripeSubscriptionId = normalizeStripeId(subscription.id)
  const stripeStatus = String(subscription.status ?? '').toLowerCase()
  const firstItem = subscription.items?.data?.[0] ?? null
  const stripePriceId = firstItem?.price?.id ?? null
  const currentPeriodEnd = getCurrentPeriodEndIso(subscription)
  const cancelAtPeriodEnd = isScheduledForCancel(subscription)

  const entitled = isEntitledStripeStatus(stripeStatus)
  const nextPlanKey =
    eventType === 'customer.subscription.deleted'
      ? 'free'
      : entitled
        ? getPlanKeyFromPriceId(stripePriceId)
        : 'free'

  const appStatus = mapAppSubscriptionStatus(eventType, stripeStatus)

  await upsertSubscriptionRow(supabase, orgId, {
    plan_key: nextPlanKey,
    status: appStatus,
    stripe_customer_id: stripeCustomerId,
    stripe_subscription_id: stripeSubscriptionId,
    stripe_price_id: stripePriceId,
    current_period_end: currentPeriodEnd,
    cancel_at_period_end: cancelAtPeriodEnd,
    stripe_status: stripeStatus,
    last_stripe_event_id: eventId,
  })

  return { ignored: false as const }
}

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripeServer()
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    if (!webhookSecret) {
      throw new Error('Missing STRIPE_WEBHOOK_SECRET')
    }

    const signature = request.headers.get('stripe-signature')
    if (!signature) {
      return NextResponse.json({ ok: false, error: 'missing_stripe_signature' }, { status: 400 })
    }

    const rawBody = await request.text()

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
    } catch (e: any) {
      return NextResponse.json(
        {
          ok: false,
          error: 'invalid_stripe_signature',
          detail: process.env.NODE_ENV !== 'production' ? String(e?.message ?? e) : undefined,
        },
        { status: 400 }
      )
    }

    const supabase = createAdminSupabase()

    const mark = await markEventProcessed(supabase, event.id, event.type)
    if (mark.duplicate) {
      return NextResponse.json({ ok: true, duplicate: true })
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const result = await handleCheckoutCompleted(supabase, session, event.id)
      return NextResponse.json({ ok: true, type: event.type, ...result })
    }

    if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      const subscription = event.data.object as Stripe.Subscription
      const result = await handleSubscriptionChanged(
        supabase,
        subscription,
        event.type,
        event.id
      )
      return NextResponse.json({ ok: true, type: event.type, ...result })
    }

    return NextResponse.json({ ok: true, ignored: true, type: event.type })
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: 'stripe_webhook_failed',
        detail: process.env.NODE_ENV !== 'production' ? String(e?.message ?? e) : undefined,
      },
      { status: 500 }
    )
  }
}