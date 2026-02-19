// app/lib/branding/logoRoute.ts
import { NextResponse } from 'next/server'
import { createClient as createSupabaseJsClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

const BUCKET = 'branding'
const FIXED_OBJECT_KEY = 'branding/logo'
const ALLOWED_MIMES = new Set(['image/png', 'image/jpeg', 'image/webp'])
const MAX_BYTES = 2 * 1024 * 1024 // 2MB

function getSupabaseUrl() {
  return process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
}

function getServiceRoleClient() {
  const url = getSupabaseUrl()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!url || !key) return null
  return createSupabaseJsClient(url, key, { auth: { persistSession: false } })
}

function toDataUri(bytes: Uint8Array, mime: string) {
  return `data:${mime};base64,${Buffer.from(bytes).toString('base64')}`
}

/**
 * GET: 本人のロゴを返す（プレビュー用に dataURI も返す）
 */
export async function GET() {
  const supabase = await createClient()

  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData?.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  const userId = userData.user.id

  // user_settings は user session（RLS）
  const { data: settings, error: sErr } = await supabase
    .from('user_settings')
    .select('logo_path, logo_mime, updated_at')
    .eq('user_id', userId)
    .maybeSingle()

  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 })

  const logo_path = settings?.logo_path ?? null
  const logo_mime = settings?.logo_mime ?? null

  let logo_data_uri: string | null = null
  if (logo_path && logo_mime) {
    const sr = getServiceRoleClient()
    if (sr) {
      try {
        const { data, error } = await sr.storage.from(BUCKET).download(logo_path)
        if (!error && data) {
          const ab = await data.arrayBuffer()
          logo_data_uri = toDataUri(new Uint8Array(ab), logo_mime)
        }
      } catch {
        // 失敗してもOK（プレビューできないだけ）
      }
    }
  }

  return NextResponse.json({
    logo_path,
    logo_mime,
    logo_data_uri,
    updated_at: settings?.updated_at ?? null,
  })
}

/**
 * POST: ロゴをアップロードして user_settings を upsert
 * - multipart/form-data の field は "file"
 * - Storage は service role で固定パスへ upsert
 */
export async function POST(req: Request) {
  const supabase = await createClient()

  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData?.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  const userId = userData.user.id

  const form = await req.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: 'Invalid multipart/form-data' }, { status: 400 })

  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 })
  }

  const mime = file.type || ''
  if (!ALLOWED_MIMES.has(mime)) {
    return NextResponse.json(
      { error: 'unsupported_mime', allowed: Array.from(ALLOWED_MIMES) },
      { status: 415 },
    )
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'file_too_large', maxBytes: MAX_BYTES }, { status: 413 })
  }

  const sr = getServiceRoleClient()
  if (!sr) {
    return NextResponse.json(
      { error: 'Missing SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL)' },
      { status: 500 },
    )
  }

  const objectPath = `users/${userId}/${FIXED_OBJECT_KEY}`
  const buf = Buffer.from(await file.arrayBuffer())

  // service role で branding に upsert
  const { error: upErr } = await sr.storage.from(BUCKET).upload(objectPath, buf, {
    upsert: true,
    contentType: mime,
    cacheControl: '0',
  })
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

  // user_settings は user session（RLS）
  const { error: setErr } = await supabase
    .from('user_settings')
    .upsert(
      { user_id: userId, logo_path: objectPath, logo_mime: mime, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    )
  if (setErr) return NextResponse.json({ error: setErr.message }, { status: 500 })

  return NextResponse.json({ ok: true, logo_path: objectPath, logo_mime: mime })
}

/**
 * DELETE: ロゴ削除（ロゴなしに戻す）
 */
export async function DELETE() {
  const supabase = await createClient()

  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData?.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  const userId = userData.user.id

  const sr = getServiceRoleClient()
  if (!sr) {
    return NextResponse.json(
      { error: 'Missing SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL)' },
      { status: 500 },
    )
  }

  const objectPath = `users/${userId}/${FIXED_OBJECT_KEY}`

  await supabase
    .from('user_settings')
    .update({ logo_path: null, logo_mime: null, updated_at: new Date().toISOString() })
    .eq('user_id', userId)

  await sr.storage.from(BUCKET).remove([objectPath])

  return NextResponse.json({ ok: true })
}
