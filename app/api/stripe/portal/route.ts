import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

import { getCurrentOrgIdForUser } from '@/lib/org/getCurrentOrgId'
import { getStripeServer } from '@/lib/stripe/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

    const orgId = await getCurrentOrgIdForUser(supabase as any, user.id)
    if (!orgId) {
      return NextResponse.json({ ok: false, error: 'current_org_not_found' }, { status: 400 })
    }

    const { data: subRow, error: subError } = await supabase
      .from('subscriptions')
      .select('org_id, plan_key, stripe_customer_id, stripe_status')
      .eq('org_id', orgId)
      .maybeSingle()

    if (subError) {
      throw new Error(subError.message)
    }

    const stripeCustomerId = String(subRow?.stripe_customer_id ?? '').trim()
    if (!stripeCustomerId) {
      return NextResponse.json(
        {
          ok: false,
          error: 'stripe_customer_not_found',
          message: 'Stripe の顧客情報がまだ作成されていません。先に有料プランの申し込みを開始してください。',
        },
        { status: 400 }
      )
    }

    const stripe = getStripeServer()
    const appUrl = getAppUrl(request)

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${appUrl}/settings/billing`,
    })

    if (!session.url) {
      throw new Error('Stripe Customer Portal session url not returned')
    }

    return NextResponse.json({
      ok: true,
      url: session.url,
    })
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: 'stripe_portal_failed',
        detail: process.env.NODE_ENV !== 'production' ? String(e?.message ?? e) : undefined,
      },
      { status: 500 }
    )
  }
}