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

export async function GET(req: NextRequest, ctx: RouteContext) {
  const params = 'then' in ctx.params ? await ctx.params : ctx.params
  const documentId = String(params.id ?? '')

  if (!UUID_RE.test(documentId)) {
    return NextResponse.json({ error: 'Invalid document id' }, { status: 400 })
  }

  const { supabase, cookiesToSet } = createSupabase(req)

  const json = (body: any, init?: ResponseInit) => {
    const res = NextResponse.json(body, init)
    for (const c of cookiesToSet) res.cookies.set(c.name, c.value, c.options)
    res.headers.set('Cache-Control', 'no-store')
    return res
  }

  // auth
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) {
    return json({ error: userErr?.message ?? 'Not authenticated' }, { status: 401 })
  }

  // documents存在確認（RLSで見えなければ404）
  const { data: doc, error: docErr } = await supabase
    .from('documents')
    .select('id')
    .eq('id', documentId)
    .maybeSingle()

  if (docErr) return json({ error: docErr.message }, { status: 500 })
  if (!doc) return json({ error: 'Document not found' }, { status: 404 })

  // 履歴：0件でも 200 + files: [] を返す（重要）
  const { data: rows, error: rowsErr } = await supabase
    .from('document_files')
    .select('id, created_at, path') // ← あなたのschemaに合わせて path
    .eq('document_id', documentId)
    .order('created_at', { ascending: false })

  if (rowsErr) return json({ error: rowsErr.message }, { status: 500 })

  return json({ files: rows ?? [] }, { status: 200 })
}
