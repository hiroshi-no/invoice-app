import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

import { getCurrentOrgIdForUser } from '@/lib/org/getCurrentOrgId'
import { getStripeServer } from '@/lib/stripe/server'
import { getStripePriceId, isPaidPlanKey, type StripePlanKey } from '@/lib/stripe/plans'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type CheckoutRequestBody = {
  planKey?: string
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
        // Route Handler では今回 cookie 書き込み不要
      },
    },
  })
}

function getAppUrl(request: NextRequest) {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (envUrl) return envUrl.replace(/\/+$/, '')
  return request.nextUrl.origin
}

function isActiveLikeStripeStatus(v: any) {
  const s = String(v ?? '').toLowerCase()
  return s === 'active' || s === 'trialing'
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabase()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
    }

    const body = (await request.json().catch(() => ({}))) as CheckoutRequestBody
    const requestedPlan = String(body?.planKey ?? '').toLowerCase()

    if (!isPaidPlanKey(requestedPlan)) {
      return NextResponse.json({ ok: false, error: 'invalid_plan_key' }, { status: 400 })
    }

    const orgId = await getCurrentOrgIdForUser(supabase as any, user.id)
    if (!orgId) {
      return NextResponse.json({ ok: false, error: 'current_org_not_found' }, { status: 400 })
    }

    const { data: subRow, error: subError } = await supabase
      .from('subscriptions')
      .select(
        'org_id, plan_key, status, stripe_status, stripe_customer_id, stripe_subscription_id'
      )
      .eq('org_id', orgId)
      .maybeSingle()

    if (subError) {
      throw new Error(subError.message)
    }

    const currentPlanKey = String(subRow?.plan_key ?? 'free').toLowerCase() as StripePlanKey
    const currentStripeStatus = String(subRow?.stripe_status ?? '').toLowerCase()

    if (currentPlanKey === requestedPlan && isActiveLikeStripeStatus(currentStripeStatus)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'already_on_requested_plan',
          message: `現在すでに ${requestedPlan} プランが有効です。`,
        },
        { status: 409 }
      )
    }

    const stripe = getStripeServer()
    const priceId = getStripePriceId(requestedPlan)
    const appUrl = getAppUrl(request)

    console.log('[stripe/checkout] start', {
      requestedPlan,
      orgId,
      hasStripeCustomerId: Boolean(subRow?.stripe_customer_id),
      appUrl,
      priceId,
    })

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/settings/billing?checkout=success`,
      cancel_url: `${appUrl}/settings/billing?checkout=cancel`,
      client_reference_id: orgId,
      metadata: {
        org_id: orgId,
        user_id: user.id,
        requested_plan: requestedPlan,
      },
      subscription_data: {
        metadata: {
          org_id: orgId,
          user_id: user.id,
          requested_plan: requestedPlan,
        },
      },
      ...(subRow?.stripe_customer_id
        ? {
            customer: subRow.stripe_customer_id,
          }
        : {
            customer_email: user.email ?? undefined,
          }),
    })

    if (!session.url) {
      throw new Error('Stripe Checkout Session url not returned')
    }

    return NextResponse.json({
      ok: true,
      url: session.url,
    })
    } catch (e: any) {
    console.error('[stripe/checkout] failed', {
      message: String(e?.message ?? e),
      stack: e?.stack ? String(e.stack) : undefined,
    })

    return NextResponse.json(
      {
        ok: false,
        error: 'stripe_checkout_failed',
        detail: process.env.NODE_ENV !== 'production' ? String(e?.message ?? e) : undefined,
      },
      { status: 500 }
    )
  }
}