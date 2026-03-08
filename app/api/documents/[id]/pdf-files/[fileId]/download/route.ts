export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

type RouteContext =
  | { params: { id: string; fileId: string } }
  | { params: Promise<{ id: string; fileId: string }> }

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

function createServiceSupabase() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  if (!serviceKey) throw new Error('Missing env: SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, serviceKey, { auth: { persistSession: false } })
}

function respondJson(cookiesToSet: any[], body: any, init?: ResponseInit) {
  const res = NextResponse.json(body, init)
  for (const c of cookiesToSet) res.cookies.set(c.name, c.value, c.options)
  res.headers.set('Cache-Control', 'no-store')
  return res
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  const { supabase, cookiesToSet } = createSupabase(req)

  const params = 'then' in (ctx.params as any) ? await (ctx.params as any) : (ctx.params as any)
  const documentId = String(params?.id ?? '')
  const fileId = String(params?.fileId ?? '')

  if (!UUID_RE.test(documentId)) return respondJson(cookiesToSet, { error: 'Invalid document id' }, { status: 400 })
  if (!UUID_RE.test(fileId)) return respondJson(cookiesToSet, { error: 'Invalid file id' }, { status: 400 })

  // auth
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) {
    return respondJson(cookiesToSet, { error: userErr?.message ?? 'Not authenticated' }, { status: 401 })
  }

  // doc → orgId確定（RLSで見えない場合も 404）
  const { data: doc, error: docErr } = await supabase
    .from('documents')
    .select('id, org_id')
    .eq('id', documentId)
    .maybeSingle()

  if (docErr) return respondJson(cookiesToSet, { error: docErr.message }, { status: 500 })
  if (!doc) return respondJson(cookiesToSet, { error: 'document_not_found' }, { status: 404 })

  const orgId = String((doc as any).org_id ?? '')
  if (!UUID_RE.test(orgId)) return respondJson(cookiesToSet, { error: 'org_id invalid' }, { status: 500 })

  // file（doc+org で絞る）
  const { data: row, error: fErr } = await supabase
    .from('document_files')
    .select('id, document_id, org_id, path')
    .eq('id', fileId)
    .eq('document_id', documentId)
    .eq('org_id', orgId)
    .maybeSingle()

  if (fErr) return respondJson(cookiesToSet, { error: fErr.message }, { status: 500 })
  if (!row) return respondJson(cookiesToSet, { error: 'file_not_found' }, { status: 404 })

  const path = String((row as any).path ?? '')
  if (!path) return respondJson(cookiesToSet, { error: 'file path missing' }, { status: 500 })

  // ★重要：pdf/save は documents バケットに upload しているので download も documents 固定
  const bucket = 'documents'

  try {
    const service = createServiceSupabase()
    const { data, error } = await service.storage.from(bucket).createSignedUrl(path, 60)
    if (error || !data?.signedUrl) {
      return respondJson(cookiesToSet, { error: error?.message ?? 'createSignedUrl failed' }, { status: 500 })
    }

    const res = NextResponse.redirect(data.signedUrl, 302)
    for (const c of cookiesToSet) res.cookies.set(c.name, c.value, c.options)
    res.headers.set('Cache-Control', 'no-store')
    return res
  } catch (e: any) {
    return respondJson(cookiesToSet, { error: e?.message ?? 'download failed' }, { status: 500 })
  }
}