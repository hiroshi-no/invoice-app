import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

import { getOrgPlan } from '@/lib/billing/getOrgPlan'
import { getCurrentOrgIdForUser } from '@/lib/org/getCurrentOrgId'

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
        savedPdfLimit: 5,
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

    const [{ data: usage }, { count: customerCount }] = await Promise.all([
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