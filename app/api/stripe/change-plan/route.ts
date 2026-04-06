export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'

import { createSupabaseServerClient } from '@/lib/api/supabase-server'
import { respondJson } from '@/lib/api/response'
import { getCurrentOrgIdForUser } from '@/lib/org/getCurrentOrgId'
import { getStripeServer } from '@/lib/stripe/server'
import {
  getStripePriceId,
  getPlanKeyFromPriceId,
  type StripePlanKey,
} from '@/lib/stripe/plans'

function unixToIso(v: number | null | undefined) {
  return typeof v === 'number' ? new Date(v * 1000).toISOString() : null
}

export async function POST(req: NextRequest) {
  try {
    const stripe = getStripeServer()
    const { supabase, cookiesToSet } = await createSupabaseServerClient(req)

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return respondJson(cookiesToSet, { ok: false, error: 'unauthorized' }, { status: 401 })
    }

    const orgId = await getCurrentOrgIdForUser(supabase as any, user.id)
    if (!orgId) {
      return respondJson(cookiesToSet, { ok: false, error: 'org_not_found' }, { status: 400 })
    }

    const body = await req.json().catch(() => null)
    const targetPlanKey = body?.targetPlanKey as StripePlanKey | undefined

    if (targetPlanKey !== 'starter' && targetPlanKey !== 'standard') {
      return respondJson(cookiesToSet, { ok: false, error: 'invalid_target_plan' }, { status: 400 })
    }

    const targetPriceId = getStripePriceId(targetPlanKey)

    const { data: currentSub, error: currentSubError } = await supabase
      .from('subscriptions')
      .select(`
        org_id,
        plan_key,
        status,
        stripe_status,
        stripe_customer_id,
        stripe_subscription_id,
        stripe_price_id,
        current_period_end,
        cancel_at_period_end
      `)
      .eq('org_id', orgId)
      .maybeSingle()

    if (currentSubError) {
      return respondJson(
        cookiesToSet,
        { ok: false, error: 'subscription_select_failed', detail: currentSubError.message },
        { status: 500 }
      )
    }

    if (!currentSub?.stripe_subscription_id) {
      return respondJson(
        cookiesToSet,
        { ok: false, error: 'stripe_subscription_not_found' },
        { status: 400 }
      )
    }

    if (currentSub.plan_key === targetPlanKey) {
      return respondJson(cookiesToSet, {
        ok: true,
        changed: false,
        billing: {
          planKey: currentSub.plan_key,
          stripeStatus: currentSub.stripe_status ?? null,
          stripePriceId: currentSub.stripe_price_id ?? null,
          currentPeriodEnd: currentSub.current_period_end ?? null,
          cancelAtPeriodEnd: !!currentSub.cancel_at_period_end,
        },
      })
    }

    const subscription = await stripe.subscriptions.retrieve(currentSub.stripe_subscription_id, {
      expand: ['items.data.price'],
    })

    const firstItem = subscription.items?.data?.[0] ?? null
    if (!firstItem?.id) {
      return respondJson(
        cookiesToSet,
        { ok: false, error: 'subscription_item_not_found' },
        { status: 400 }
      )
    }

    const updated = await stripe.subscriptions.update(subscription.id, {
      items: [
        {
          id: firstItem.id,
          price: targetPriceId,
        },
      ],
      proration_behavior: 'create_prorations',
      cancel_at_period_end: false,
    })

    const updatedFirstItem = updated.items?.data?.[0] ?? null
    const updatedPriceId =
      typeof updatedFirstItem?.price?.id === 'string' ? updatedFirstItem.price.id : targetPriceId

    const nextPlanKey = getPlanKeyFromPriceId(updatedPriceId)
    const nextCurrentPeriodEnd =
      unixToIso(updatedFirstItem?.current_period_end ?? null) ??
      unixToIso((updated as any)?.current_period_end ?? null)

    const nextStripeStatus = typeof updated.status === 'string' ? updated.status : null

    return respondJson(cookiesToSet, {
      ok: true,
      changed: true,
      billing: {
        planKey: nextPlanKey,
        stripeStatus: nextStripeStatus,
        stripePriceId: updatedPriceId,
        currentPeriodEnd: nextCurrentPeriodEnd,
        cancelAtPeriodEnd: !!updated.cancel_at_period_end,
      },
    })
  } catch (e: any) {
    return respondJson(
      [],
      {
        ok: false,
        error: 'stripe_change_plan_failed',
        detail: e?.message ?? 'unknown_error',
      },
      { status: 500 }
    )
  }
}