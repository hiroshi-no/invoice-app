export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

type RouteContext = { params: { id: string } } | { params: Promise<{ id: string }> }

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

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const p = 'then' in ctx.params ? await ctx.params : ctx.params
  const documentId = String(p.id ?? '')

  const { supabase, cookiesToSet } = createSupabase(req)

  // ✅ どのreturnでもCookieを積む
  const respond = (body: any, init?: ResponseInit) => {
    const res = NextResponse.json(body, init)
    for (const c of cookiesToSet) res.cookies.set(c.name, c.value, c.options)
    return res
  }

  // ✅ UUIDバリデーション
  if (!UUID_RE.test(documentId)) {
    return respond({ error: 'Invalid document id' }, { status: 400 })
  }

  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) {
    return respond({ error: userErr?.message ?? 'Not authenticated' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))

  // draftのみ更新可
  const { data: doc, error: docErr } = await supabase
    .from('documents')
    .select('id,status')
    .eq('id', documentId)
    .single()

  if (docErr) return respond({ error: docErr.message }, { status: 500 })
  if (!doc) return respond({ error: 'Not found' }, { status: 404 })
  if (doc.status !== 'draft') return respond({ error: 'document status must be draft' }, { status: 409 })
 

  const patch: any = {
    customer_id: body.customer_id ?? null,
    title: body.title ?? null,
    notes: body.notes ?? null,
    due_date: body.due_date ?? null,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('documents')
    .update(patch)
    .eq('id', documentId)
    .select('*')
    .single()

  if (error) return respond({ error: error.message }, { status: 500 })

  return respond({ document: data }, { status: 200 })
}
