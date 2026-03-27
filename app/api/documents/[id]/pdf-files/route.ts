export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

type RouteContext =
  | { params: { id: string } }
  | { params: Promise<{ id: string }> }

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

function respondJson(cookiesToSet: any[], body: any, init?: ResponseInit) {
  const res = NextResponse.json(body, init)
  for (const c of cookiesToSet) res.cookies.set(c.name, c.value, c.options)
  res.headers.set('Cache-Control', 'no-store')
  return res
}

function pickFileName(row: any, path: string) {
  const explicit = String(
    row.file_name ?? row.filename ?? row.name ?? ''
  ).trim()
  if (explicit) return explicit

  const last = path.split('/').pop() ?? ''
  if (!last) return null

  const cleaned = last.replace(/^\d+_/, '')
  return cleaned || last
}

function pickVersion(row: any, path: string) {
  const raw = Number(
    row.version ?? row.file_version ?? row.rev ?? 0
  )
  if (Number.isFinite(raw) && raw > 0) return raw

  const m = path.match(/_v(\d+)\.pdf$/i)
  if (m) {
    const parsed = Number(m[1])
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }

  return null
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  const { supabase, cookiesToSet } = createSupabase(req)

  const params = 'then' in (ctx.params as any) ? await (ctx.params as any) : (ctx.params as any)
  const documentId = String(params?.id ?? '')
  if (!UUID_RE.test(documentId)) {
    return respondJson(cookiesToSet, { error: 'Invalid document id' }, { status: 400 })
  }

  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) {
    return respondJson(
      cookiesToSet,
      { error: userErr?.message ?? 'Not authenticated' },
      { status: 401 }
    )
  }

  const { data: doc, error: docErr } = await supabase
    .from('documents')
    .select('id, org_id')
    .eq('id', documentId)
    .maybeSingle()

  if (docErr) return respondJson(cookiesToSet, { error: docErr.message }, { status: 500 })
  if (!doc) return respondJson(cookiesToSet, { error: 'document_not_found' }, { status: 404 })

  const orgId = String((doc as any).org_id ?? '')
  if (!UUID_RE.test(orgId)) {
    return respondJson(cookiesToSet, { error: 'org_id invalid' }, { status: 500 })
  }

  let rows: any[] = []

  {
    const r = await supabase
      .from('document_files')
      .select('*')
      .eq('document_id', documentId)
      .eq('org_id', orgId)
      .order('version', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(100)

    if (r.error) return respondJson(cookiesToSet, { error: r.error.message }, { status: 500 })
    rows = (r.data ?? []) as any[]
  }

  if (rows.length === 0) {
    const r2 = await supabase
      .from('document_files')
      .select('*')
      .eq('document_id', documentId)
      .order('version', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(100)

    if (r2.error) return respondJson(cookiesToSet, { error: r2.error.message }, { status: 500 })
    rows = (r2.data ?? []) as any[]
  }

  const files = (rows ?? []).map((r: any) => {
    const id = String(r.id ?? '')
    const path = String(r.path ?? r.storage_path ?? '')
    const fileName = pickFileName(r, path)

    let mime = String(r.mime ?? r.content_type ?? r.file_mime ?? '').trim()
    if (!mime && /\.pdf$/i.test(path)) mime = 'application/pdf'

    const createdAt = r.created_at ?? null
    const version = pickVersion(r, path)

    return {
      id,
      path,
      file_name: fileName,
      version,
      mime,
      created_at: createdAt,
      download_url: id ? `/api/documents/${documentId}/pdf-files/${id}/download` : null,
    }
  })

  return respondJson(
    cookiesToSet,
    {
      ok: true,
      org_id: orgId,
      document_id: documentId,
      files,
    },
    { status: 200 }
  )
}