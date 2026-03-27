// app/api/customers/route.ts
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'

import { createSupabaseServerClient } from '@/lib/api/supabase-server'
import { respondJson } from '@/lib/api/response'
import { requireCurrentOrgId } from '@/lib/org/getCurrentOrgId'

function nullableText(v: unknown) {
  if (v == null) return null
  const s = String(v).trim()
  return s ? s : null
}

export async function GET(req: NextRequest) {
  const { supabase, cookiesToSet } = createSupabaseServerClient(req)

  const respond = (body: any, init?: ResponseInit) => {
    return respondJson(cookiesToSet, body, init)
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
    .eq('org_id', orgId)
    .order('name', { ascending: true })
    .limit(500)

  if (error) {
    console.error('[customers][GET] fetch failed', error)

    return respond(
      {
        error: 'customers_fetch_failed',
        message: '顧客一覧の取得に失敗しました。',
        detail: process.env.NODE_ENV !== 'production' ? error.message : undefined,
      },
      { status: 500 }
    )
  }

  return respond({ customers: data ?? [] }, { status: 200 })
}

export async function POST(req: NextRequest) {
  const { supabase, cookiesToSet } = createSupabaseServerClient(req)

  const respond = (body: any, init?: ResponseInit) => {
    return respondJson(cookiesToSet, body, init)
  }

  const current = await requireCurrentOrgId(supabase as any)
  if (!current.ok) {
    return respond(current.body, { status: current.status })
  }

  const orgId = current.orgId
  const userId = current.userId

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

  const { data: inserted, error: insertErr } = await supabase
    .from('customers')
    .insert({
      org_id: orgId,
      created_by: userId,
      name,
      email,
      phone,
      postal_code: postalCode,
      address1,
      address2,
      note,
    })
    .select(
      'id, org_id, name, email, phone, postal_code, address1, address2, note, created_at, updated_at'
    )
    .single()

  if (insertErr) {
    console.error('[customers][POST] insert failed', insertErr)

    return respond(
      {
        error: 'customer_create_failed',
        message: '顧客の作成に失敗しました。',
        detail: process.env.NODE_ENV !== 'production' ? insertErr.message : undefined,
      },
      { status: 500 }
    )
  }

  return respond(
    {
      ok: true,
      customer: inserted,
    },
    { status: 201 }
  )
}