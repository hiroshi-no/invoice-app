export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'

import { respondJson } from '@/lib/api/response'
import { createSupabaseServerClient } from '@/lib/api/supabase-server'
import { withDebug } from '@/lib/debug'
import { requireCurrentOrgId } from '@/lib/org/getCurrentOrgId'

// GET /api/documents （簡易一覧）
// POST /api/documents （新規作成：org_id必須）
export async function GET(req: NextRequest) {
  const { supabase, cookiesToSet } = createSupabaseServerClient(req)

  const respond = (body: any, init?: ResponseInit) => {
    return respondJson(cookiesToSet, body, init)
  }

  const current = await requireCurrentOrgId(supabase as any)
  if (!current.ok) {
    const { detail, ...safeBody } = current.body
    return respond(
      {
        ...safeBody,
        ...withDebug(detail ? { detail } : {}),
      },
      { status: current.status }
    )
  }

  const { orgId } = current

  const { data, error } = await supabase
    .from('documents')
    .select('id,status,document_no,issued_at,currency,total_amount,created_at,updated_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return respond(
      {
        error: 'documents_fetch_failed',
        message: '帳票一覧の取得に失敗しました。時間をおいて再実行してください。',
        ...withDebug({ detail: error.message, orgId }),
      },
      { status: 500 }
    )
  }

  return respond({ documents: data ?? [] }, { status: 200 })
}

export async function POST(req: NextRequest) {
  const { supabase, cookiesToSet } = createSupabaseServerClient(req)

  const respond = (body: any, init?: ResponseInit) => {
    return respondJson(cookiesToSet, body, init)
  }

  const current = await requireCurrentOrgId(supabase as any)
  if (!current.ok) {
    const { detail, ...safeBody } = current.body
    return respond(
      {
        ...safeBody,
        ...withDebug(detail ? { detail } : {}),
      },
      { status: current.status }
    )
  }

  const { orgId, userId } = current

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return respond(
      {
        error: 'invalid_json',
        message: 'リクエスト内容が不正です。',
      },
      { status: 400 }
    )
  }

  const now = new Date()
  const issueYear = now.getFullYear()

  const insertRow: any = {
    org_id: orgId,
    created_by: userId,
    doc_type: body.doc_type ?? 'invoice',
    status: 'draft',
    currency: body.currency ?? 'JPY',
    issue_year: issueYear,
    customer_id: body.customer_id ?? null,
    title: body.title ?? null,
    notes: body.notes ?? null,
    due_date: body.due_date ?? null,
  }

  const { data, error } = await supabase
    .from('documents')
    .insert(insertRow)
    .select('id')
    .single()

  if (error) {
    return respond(
      {
        error: 'document_create_failed',
        message: '帳票の作成に失敗しました。時間をおいて再実行してください。',
        ...withDebug({ detail: error.message, orgId, insertRow }),
      },
      { status: 500 }
    )
  }

  return respond({ ok: true, id: data.id }, { status: 201 })
}