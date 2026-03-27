// app/api/customers/[id]/route.ts
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'

import { createSupabaseServerClient } from '@/lib/api/supabase-server'
import { respondJson } from '@/lib/api/response'
import { requireCurrentOrgId } from '@/lib/org/getCurrentOrgId'

type RouteContext =
  | { params: { id: string } }
  | { params: Promise<{ id: string }> }

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function nullableText(v: unknown) {
  if (v == null) return null
  const s = String(v).trim()
  return s ? s : null
}

async function unwrapParams(ctx: RouteContext) {
  const p = (ctx as any).params
  return 'then' in p ? await p : p
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  const params = await unwrapParams(ctx)
  const customerId = String((params as any)?.id ?? '')

  const { supabase, cookiesToSet } = createSupabaseServerClient(req)

  const respond = (body: any, init?: ResponseInit) => {
    return respondJson(cookiesToSet, body, init)
  }

  if (!UUID_RE.test(customerId)) {
    return respond(
      {
        error: 'invalid_customer_id',
        message: '不正な顧客IDです。',
      },
      { status: 400 }
    )
  }

  const current = await requireCurrentOrgId(supabase as any)
  if (!current.ok) {
    return respond(current.body, { status: current.status })
  }

  const orgId = current.orgId

  const { data, error } = await supabase
    .from('customers')
    .select(
      'id, org_id, name, email, phone, postal_code, address1, address2, note, created_at, updated_at'
    )
    .eq('id', customerId)
    .eq('org_id', orgId)
    .maybeSingle()

  if (error) {
    return respond(
      {
        error: 'customer_fetch_failed',
        message: '顧客情報の取得に失敗しました。',
        detail: process.env.NODE_ENV !== 'production' ? error.message : undefined,
      },
      { status: 500 }
    )
  }

  if (!data) {
    return respond(
      {
        error: 'customer_not_found',
        message: '対象の顧客が見つかりません。',
      },
      { status: 404 }
    )
  }

  return respond({ customer: data }, { status: 200 })
}

async function updateCustomer(req: NextRequest, ctx: RouteContext) {
  const params = await unwrapParams(ctx)
  const customerId = String((params as any)?.id ?? '')

  const { supabase, cookiesToSet } = createSupabaseServerClient(req)

  const respond = (body: any, init?: ResponseInit) => {
    return respondJson(cookiesToSet, body, init)
  }

  if (!UUID_RE.test(customerId)) {
    return respond(
      {
        error: 'invalid_customer_id',
        message: '不正な顧客IDです。',
      },
      { status: 400 }
    )
  }

  const current = await requireCurrentOrgId(supabase as any)
  if (!current.ok) {
    return respond(current.body, { status: current.status })
  }

  const orgId = current.orgId

  const body = await req.json().catch(() => ({}))

  const name = nullableText(body?.name)
  const email = nullableText(body?.email)
  const phone = nullableText(body?.phone)
  const postalCode = nullableText(body?.postal_code)
  const address1 = nullableText(body?.address1)
  const address2 = nullableText(body?.address2)
  const note = nullableText(body?.note)

  if (!name) {
    return respond(
      {
        error: 'invalid_name',
        message: '顧客名を入力してください。',
      },
      { status: 400 }
    )
  }

  const { data: exists, error: existsErr } = await supabase
    .from('customers')
    .select('id')
    .eq('id', customerId)
    .eq('org_id', orgId)
    .maybeSingle()

  if (existsErr) {
    return respond(
      {
        error: 'customer_fetch_failed',
        message: '顧客情報の確認に失敗しました。',
        detail: process.env.NODE_ENV !== 'production' ? existsErr.message : undefined,
      },
      { status: 500 }
    )
  }

  if (!exists) {
    return respond(
      {
        error: 'customer_not_found',
        message: '対象の顧客が見つかりません。',
      },
      { status: 404 }
    )
  }

  const { data: updated, error: updateErr } = await supabase
    .from('customers')
    .update({
      name,
      email,
      phone,
      postal_code: postalCode,
      address1,
      address2,
      note,
      updated_at: new Date().toISOString(),
    })
    .eq('id', customerId)
    .eq('org_id', orgId)
    .select(
      'id, org_id, name, email, phone, postal_code, address1, address2, note, created_at, updated_at'
    )
    .maybeSingle()

  if (updateErr) {
    return respond(
      {
        error: 'customer_update_failed',
        message: '顧客情報の更新に失敗しました。',
        detail: process.env.NODE_ENV !== 'production' ? updateErr.message : undefined,
      },
      { status: 500 }
    )
  }

  if (!updated) {
    return respond(
      {
        error: 'customer_not_found',
        message: '対象の顧客が見つかりません。',
      },
      { status: 404 }
    )
  }

  return respond(
    {
      ok: true,
      customer: updated,
    },
    { status: 200 }
  )
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  return updateCustomer(req, ctx)
}

export async function PUT(req: NextRequest, ctx: RouteContext) {
  return updateCustomer(req, ctx)
}