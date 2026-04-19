export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

type RouteContext = { params: { id: string } } | { params: Promise<{ id: string }> }

type TemplateProfile = 'standard' | 'creator' | 'interior'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function createSupabase(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const cookiesToSet: Array<{ name: string; value: string; options?: any }> = []

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return req.cookies.getAll().map((c) => ({ name: c.name, value: c.value }))
      },
      setAll(list) {
        cookiesToSet.push(...list)
      },
    },
  })

  return { supabase, cookiesToSet }
}

async function unwrapParams(ctx: RouteContext) {
  const p = (ctx as any).params
  return 'then' in p ? await p : p
}

function nullableText(v: unknown) {
  if (v == null) return null
  const s = String(v).trim()
  return s ? s : null
}

function normalizeCustomerHonorific(v: unknown): '御中' | '様' | null {
  const s = String(v ?? '').trim()
  if (s === '御中' || s === '様') return s
  return null
}

function normalizeTemplateProfile(v: unknown): TemplateProfile {
  const s = String(v ?? '').trim()
  if (s === 'creator' || s === 'interior' || s === 'standard') return s
  return 'standard'
}

function normalizeExtendedMeta(v: unknown) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {}
  return v as Record<string, unknown>
}

async function updateDocumentMeta(req: NextRequest, ctx: RouteContext) {
  const params = await unwrapParams(ctx)
  const documentId = String((params as any)?.id ?? '')

  const { supabase, cookiesToSet } = createSupabase(req)

  const respond = (body: any, init?: ResponseInit) => {
    const res = NextResponse.json(body, init)
    for (const c of cookiesToSet) res.cookies.set(c.name, c.value, c.options)
    res.headers.set('Cache-Control', 'no-store')
    return res
  }

  if (!UUID_RE.test(documentId)) {
    return respond({ error: 'Invalid document id' }, { status: 400 })
  }

  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) {
    return respond({ error: userErr?.message ?? 'Not authenticated' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))

  const { data: doc, error: docErr } = await supabase
    .from('documents')
    .select('id, org_id, status, template_profile, extended_meta')
    .eq('id', documentId)
    .maybeSingle()

  if (docErr) return respond({ error: docErr.message }, { status: 500 })
  if (!doc) return respond({ error: 'Not found' }, { status: 404 })

  const orgId = String((doc as any).org_id ?? '')
  if (!UUID_RE.test(orgId)) return respond({ error: 'Document org_id not found' }, { status: 500 })

  if ((doc as any).status !== 'draft') {
    return respond({ error: 'document status must be draft' }, { status: 409 })
  }

  const nextCustomerId = body?.customer_id ?? null
  if (nextCustomerId) {
    const idStr = String(nextCustomerId)
    if (!UUID_RE.test(idStr)) return respond({ error: 'Invalid customer_id' }, { status: 400 })

    const { data: c, error: cErr } = await supabase
      .from('customers')
      .select('id, name')
      .eq('id', idStr)
      .eq('org_id', orgId)
      .maybeSingle()

    if (cErr) return respond({ error: cErr.message }, { status: 500 })
    if (!c) return respond({ error: 'Invalid customer_id' }, { status: 400 })
  }

  const patch: any = {
    customer_id: nextCustomerId,
    customer_name: nullableText(body?.customer_name),
    customer_honorific: normalizeCustomerHonorific(body?.customer_honorific),
    title: nullableText(body?.title),
    notes: nullableText(body?.notes),
    due_date: body?.due_date ?? null,
    updated_at: new Date().toISOString(),
  }

  if (Object.prototype.hasOwnProperty.call(body, 'template_profile')) {
    patch.template_profile = normalizeTemplateProfile(body?.template_profile)
  }

  if (Object.prototype.hasOwnProperty.call(body, 'extended_meta')) {
    patch.extended_meta = normalizeExtendedMeta(body?.extended_meta)
  }

  const { data: updated, error: upErr } = await supabase
    .from('documents')
    .update(patch)
    .eq('id', documentId)
    .eq('org_id', orgId)
    .select('*')
    .maybeSingle()

  if (upErr) return respond({ error: upErr.message }, { status: 500 })
  if (!updated) return respond({ error: 'Not found' }, { status: 404 })

  return respond({ document: updated }, { status: 200 })
}

// GET /api/documents/[id]
export async function GET(req: NextRequest, ctx: RouteContext) {
  const params = await unwrapParams(ctx)
  const documentId = String((params as any)?.id ?? '')

  const { supabase, cookiesToSet } = createSupabase(req)
  const respond = (body: any, init?: ResponseInit) => {
    const res = NextResponse.json(body, init)
    for (const c of cookiesToSet) res.cookies.set(c.name, c.value, c.options)
    res.headers.set('Cache-Control', 'no-store')
    return res
  }

  if (!UUID_RE.test(documentId)) {
    return respond({ error: 'Invalid document id' }, { status: 400 })
  }

  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) {
    return respond({ error: userErr?.message ?? 'Not authenticated' }, { status: 401 })
  }

  const { data: doc, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .maybeSingle()

  if (error) return respond({ error: error.message }, { status: 500 })
  if (!doc) return respond({ error: 'Not found' }, { status: 404 })

  return respond({ document: doc }, { status: 200 })
}

// PATCH /api/documents/[id]
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  return updateDocumentMeta(req, ctx)
}

// PUT /api/documents/[id]（互換用）
export async function PUT(req: NextRequest, ctx: RouteContext) {
  return updateDocumentMeta(req, ctx)
}