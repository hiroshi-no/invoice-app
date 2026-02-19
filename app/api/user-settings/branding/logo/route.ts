export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

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
  return res
}

const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp'])

export async function GET(req: NextRequest) {
  const { supabase, cookiesToSet } = createSupabase(req)

  // auth
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) {
    return respondJson(cookiesToSet, { error: userErr?.message ?? 'Not authenticated' }, { status: 401 })
  }
  const userId = userData.user.id

  // user_settings（RLS: 本人だけ読める想定）
  const { data: settings, error } = await supabase
    .from('user_settings')
    .select('logo_path, logo_mime')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) return respondJson(cookiesToSet, { error: error.message }, { status: 500 })

  const logoPath = String((settings as any)?.logo_path ?? '')
  const logoMime = String((settings as any)?.logo_mime ?? '')

    if (!logoPath) {
    return respondJson(cookiesToSet, { logo: null }, { status: 200 })
  }

  return respondJson(
    cookiesToSet,
    { logo: { path: logoPath, mime: logoMime } },
    { status: 200 }
  )
}

export async function POST(req: NextRequest) {
  const { supabase, cookiesToSet } = createSupabase(req)

  // auth
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) {
    return respondJson(cookiesToSet, { error: userErr?.message ?? 'Not authenticated' }, { status: 401 })
  }
  const userId = userData.user.id

  // multipart
  let file: File | null = null
  try {
    const form = await req.formData()
    file = (form.get('file') as any) ?? null
  } catch {
    return respondJson(cookiesToSet, { error: 'Invalid multipart/form-data' }, { status: 400 })
  }

  if (!file || typeof (file as any).arrayBuffer !== 'function') {
    return respondJson(cookiesToSet, { error: 'file is required (field name: file)' }, { status: 400 })
  }

  const mime = String((file as any).type ?? '').toLowerCase()
  if (!ALLOWED_MIME.has(mime)) {
    return respondJson(cookiesToSet, { error: `Unsupported file type: ${mime}` }, { status: 400 })
  }

  // サイズ制限（例：2MB）
  const size = Number((file as any).size ?? 0)
  if (size <= 0) return respondJson(cookiesToSet, { error: 'Empty file' }, { status: 400 })
  if (size > 2 * 1024 * 1024) return respondJson(cookiesToSet, { error: 'File too large (max 2MB)' }, { status: 413 })

  const logoPath = `users/${userId}/branding/logo` // 固定パス
  const buf = Buffer.from(await (file as any).arrayBuffer())

  // Storage：service role で上書き
  try {
    const service = createServiceSupabase()
    const { error: upErr } = await service.storage.from('branding').upload(logoPath, buf, {
      contentType: mime,
      upsert: true,
    })
    if (upErr) return respondJson(cookiesToSet, { error: 'Storage upload failed: ' + upErr.message }, { status: 500 })
  } catch (e: any) {
    return respondJson(cookiesToSet, { error: e?.message ?? 'Storage upload failed' }, { status: 500 })
  }

  // user_settings：本人として upsert（RLS前提）
  const now = new Date().toISOString()
  const { error: dbErr } = await supabase
    .from('user_settings')
    .upsert(
      { user_id: userId, logo_path: logoPath, logo_mime: mime, updated_at: now },
      { onConflict: 'user_id' }
    )

  if (dbErr) return respondJson(cookiesToSet, { error: 'user_settings upsert failed: ' + dbErr.message }, { status: 500 })

  return respondJson(cookiesToSet, { ok: true, logo: { path: logoPath, mime } }, { status: 200 })
}

export async function DELETE(req: NextRequest) {
  const { supabase, cookiesToSet } = createSupabase(req)

  // auth
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) {
    return respondJson(cookiesToSet, { error: userErr?.message ?? 'Not authenticated' }, { status: 401 })
  }
  const userId = userData.user.id

  // 現在のpath確認（本人行のみ）
  const { data: settings, error } = await supabase
    .from('user_settings')
    .select('logo_path')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) return respondJson(cookiesToSet, { error: error.message }, { status: 500 })

  const logoPath = String((settings as any)?.logo_path ?? '')

  // Storage remove（無くてもOK）
  if (logoPath) {
    try {
      const service = createServiceSupabase()
      await service.storage.from('branding').remove([logoPath]).catch(() => {})
    } catch {}
  }

  // user_settings を null に戻す
  const now = new Date().toISOString()
  const { error: updErr } = await supabase
    .from('user_settings')
    .upsert({ user_id: userId, logo_path: null, logo_mime: null, updated_at: now }, { onConflict: 'user_id' })

  if (updErr) return respondJson(cookiesToSet, { error: 'user_settings update failed: ' + updErr.message }, { status: 500 })

  return respondJson(cookiesToSet, { ok: true }, { status: 200 })
}
