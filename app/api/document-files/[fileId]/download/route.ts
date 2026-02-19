// app/api/document-files/[fileId]/download/route.ts
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

type RouteContext =
  | { params: { fileId: string } }
  | { params: Promise<{ fileId: string }> }

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
  const fileId = String(params.fileId ?? '')

  if (!UUID_RE.test(fileId)) {
    return NextResponse.json({ error: 'Invalid fileId' }, { status: 400 })
  }

  const { supabase, cookiesToSet } = createSupabase(req)

  const json = (body: any, init?: ResponseInit) => {
    const res = NextResponse.json(body, init)
    for (const c of cookiesToSet) res.cookies.set(c.name, c.value, c.options)
    res.headers.set('Cache-Control', 'no-store')
    return res
  }

  // auth（未ログインは401）
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) {
    return json({ error: userErr?.message ?? 'Not authenticated' }, { status: 401 })
  }

  // document_files から path を取得（RLSで本人の行だけ見える前提）
  const { data: row, error: rowErr } = await supabase
    .from('document_files')
    .select('id, path')
    .eq('id', fileId)
    .maybeSingle()

  // 存在しない or RLSで見えない → 404（情報を漏らさない）
  if (rowErr || !row?.path) {
    return json({ error: 'File not found' }, { status: 404 })
  }

  // Storage: documents bucket の署名URLを発行してリダイレクト
  const { data: signed, error: signErr } = await supabase.storage
    .from('documents')
    .createSignedUrl(row.path, 60)

  if (signErr || !signed?.signedUrl) {
    // ここも404寄せ（存在/権限を漏らさない）
    return json({ error: 'File not found' }, { status: 404 })
  }

  const res = NextResponse.redirect(signed.signedUrl, 302)
  for (const c of cookiesToSet) res.cookies.set(c.name, c.value, c.options)
  res.headers.set('Cache-Control', 'no-store')
  return res
}
