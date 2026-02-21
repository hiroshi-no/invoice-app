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

async function readJsonOrRaw(res: Response) {
  const text = await res.text().catch(() => '')
  try {
    return { json: text ? JSON.parse(text) : {}, raw: text }
  } catch {
    return { json: { raw: text }, raw: text }
  }
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const params = 'then' in ctx.params ? await ctx.params : ctx.params
  const documentId = String(params.id ?? '')

  const { supabase, cookiesToSet } = createSupabase(req)

  const respond = (body: any, status = 200) => {
    const res = NextResponse.json(body, { status })
    for (const c of cookiesToSet) res.cookies.set(c.name, c.value, c.options)
    res.headers.set('Cache-Control', 'no-store')
    return res
  }

  if (!UUID_RE.test(documentId)) return respond({ error: 'Invalid document id' }, 400)

  // auth
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) return respond({ error: userErr?.message ?? 'Not authenticated' }, 401)

  // x-items-hash 必須
  const itemsHash = (req.headers.get('x-items-hash') ?? '').trim().toLowerCase()
  if (!itemsHash) return respond({ error: 'Precondition required: x-items-hash' }, 428)

  // 状態確認（issued なら issue をスキップして pdf/save だけ実行できるように）
  const { data: doc, error: docErr } = await supabase
    .from('documents')
    .select('id, status')
    .eq('id', documentId)
    .maybeSingle()

  if (docErr) return respond({ error: docErr.message }, 500)
  if (!doc) return respond({ error: 'Document not found' }, 404)
  if (doc.status !== 'draft' && doc.status !== 'issued') return respond({ error: 'invalid document status' }, 409)

  const origin = req.nextUrl.origin
  const cookie = req.headers.get('cookie') ?? ''

  const commonHeaders: Record<string, string> = {
    cookie,
    'x-confirm-saved-items': '1',
    'x-items-hash': itemsHash,
  }

  // 1) issue（draft の時だけ）
  let issueResult: any = { skipped: true }
  if (doc.status === 'draft') {
    const r1 = await fetch(`${origin}/api/documents/${documentId}/issue`, {
      method: 'POST',
      headers: commonHeaders,
      cache: 'no-store',
    })

    const { json, raw } = await readJsonOrRaw(r1)
    if (!r1.ok) {
      return respond(
        { error: 'issue_failed', status: r1.status, detail: json, raw: raw.slice(0, 500) },
        r1.status
      )
    }
    issueResult = json
  }

  // 2) pdf/save（必ず）
  const r2 = await fetch(`${origin}/api/documents/${documentId}/pdf/save`, {
    method: 'POST',
    headers: commonHeaders,
    cache: 'no-store',
  })

  const { json: pdfJson, raw: pdfRaw } = await readJsonOrRaw(r2)
  if (!r2.ok) {
    return respond(
      { error: 'pdf_save_failed', status: r2.status, detail: pdfJson, raw: pdfRaw.slice(0, 500) },
      r2.status
    )
  }

  return respond({ ok: true, issue: issueResult, pdf: pdfJson }, 200)
}