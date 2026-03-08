export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getCurrentOrgId } from '@/lib/org/getCurrentOrgId'

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

// GET /api/documents （簡易一覧）
export async function GET(req: NextRequest) {
  const { supabase, cookiesToSet } = createSupabase(req)
  const respond = (body: any, init?: ResponseInit) => {
    const res = NextResponse.json(body, init)
    for (const c of cookiesToSet) res.cookies.set(c.name, c.value, c.options)
    return res
  }

  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) {
    return respond({ error: userErr?.message ?? 'Not authenticated' }, { status: 401 })
  }

  let orgId: string
  try {
    orgId = await getCurrentOrgId(supabase, userData.user.id)
  } catch (e: any) {
    return respond({ error: e?.message ?? 'org not set' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('documents')
    .select('id,status,document_no,issued_at,currency,total_amount,created_at,updated_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return respond({ error: error.message }, { status: 500 })
  return respond({ documents: data ?? [] }, { status: 200 })
}

// POST /api/documents （新規作成：org_id必須）
export async function POST(req: NextRequest) {
  const { supabase, cookiesToSet } = createSupabase(req)
  const respond = (body: any, init?: ResponseInit) => {
    const res = NextResponse.json(body, init)
    for (const c of cookiesToSet) res.cookies.set(c.name, c.value, c.options)
    return res
  }

  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) {
    return respond({ error: userErr?.message ?? 'Not authenticated' }, { status: 401 })
  }

  const userId = userData.user.id
  let orgId: string
  try {
    orgId = await getCurrentOrgId(supabase, userId)
  } catch (e: any) {
    return respond({ error: e?.message ?? 'org not set' }, { status: 400 })
  }

  const body = await req.json().catch(() => ({}))

  const now = new Date()
  const issueYear = now.getFullYear()

  const insertRow: any = {
    org_id: orgId, // ✅ 必須
    created_by: userId, // ✅ 既存方針のまま残すと便利
    doc_type: body.doc_type ?? 'invoice',
    status: 'draft',
    currency: body.currency ?? 'JPY',
    issue_year: issueYear,
    customer_id: body.customer_id ?? null,
    title: body.title ?? null,
    notes: body.notes ?? null,
    due_date: body.due_date ?? null,
  }

  const { data, error } = await supabase.from('documents').insert(insertRow).select('id').single()
  if (error) return respond({ error: error.message }, { status: 500 })

  return respond({ ok: true, id: data.id }, { status: 201 })
}