export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

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

export async function GET(req: NextRequest, ctx: RouteContext) {
  const params = 'then' in ctx.params ? await ctx.params : ctx.params
  const documentId = String(params.id ?? '')
  const fileId = String(params.fileId ?? '')

  if (!UUID_RE.test(documentId) || !UUID_RE.test(fileId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  const { supabase, cookiesToSet } = createSupabase(req)

  const json = (body: any, status = 200) => {
    const res = NextResponse.json(body, { status })
    for (const c of cookiesToSet) res.cookies.set(c.name, c.value, c.options)
    res.headers.set('Cache-Control', 'no-store')
    return res
  }

  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) return json({ error: 'Not authenticated' }, 401)

  // ✅ path / storage_path どちらでも拾えるようにする（過去互換）
  const { data: row, error: rowErr } = await supabase
    .from('document_files')
    .select('id, document_id, path, storage_path')
    .eq('id', fileId)
    .eq('document_id', documentId)
    .maybeSingle()

  const filePath = (row as any)?.path ?? (row as any)?.storage_path ?? null

  // 情報漏洩防止で 404 寄せ
  if (rowErr || !filePath) return json({ error: 'File not found' }, 404)

  const { data: signed, error: signErr } = await supabase.storage
    .from('documents')
    .createSignedUrl(filePath, 60)

  if (signErr || !signed?.signedUrl) return json({ error: 'File not found' }, 404)

  const res = NextResponse.redirect(signed.signedUrl, 302)
  for (const c of cookiesToSet) res.cookies.set(c.name, c.value, c.options)
  res.headers.set('Cache-Control', 'no-store')
  return res
}
