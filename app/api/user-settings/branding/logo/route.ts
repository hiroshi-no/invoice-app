export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
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

  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) {
    return respondJson(cookiesToSet, { error: userErr?.message ?? 'Not authenticated' }, { status: 401 })
  }

  const userId = userData.user.id
  let orgId: string
  try {
    orgId = await getCurrentOrgId(supabase as any, userId)
  } catch (e: any) {
    return respondJson(cookiesToSet, { error: e?.message ?? 'org not found' }, { status: 500 })
  }

  const { data: settings, error } = await supabase
    .from('user_settings')
    .select('logo_path, logo_mime')
    .eq('org_id', orgId)
    .maybeSingle()

  if (error) return respondJson(cookiesToSet, { error: error.message }, { status: 500 })

  const logoPath = String((settings as any)?.logo_path ?? '')
  const logoMime = String((settings as any)?.logo_mime ?? '')

  if (!logoPath) return respondJson(cookiesToSet, { logo: null }, { status: 200 })

  return respondJson(cookiesToSet, { logo: { path: logoPath, mime: logoMime } }, { status: 200 })
}

export async function POST(req: NextRequest) {
  const { supabase, cookiesToSet } = createSupabase(req)

  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) {
    return respondJson(cookiesToSet, { error: userErr?.message ?? 'Not authenticated' }, { status: 401 })
  }

  const userId = userData.user.id
  let orgId: string
  try {
    orgId = await getCurrentOrgId(supabase as any, userId)
  } catch (e: any) {
    return respondJson(cookiesToSet, { error: e?.message ?? 'org not found' }, { status: 500 })
  }

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

  const size = Number((file as any).size ?? 0)
  if (size <= 0) return respondJson(cookiesToSet, { error: 'Empty file' }, { status: 400 })
  if (size > 2 * 1024 * 1024) return respondJson(cookiesToSet, { error: 'File too large (max 2MB)' }, { status: 413 })

  // ✅ org共通パス
  const extByMime: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
  }

  const ext = extByMime[mime]
  if (!ext) {
    return respondJson(cookiesToSet, { error: `Unsupported file type: ${mime}` }, { status: 400 })
  }

  // 方針：branding/<orgId>/logo.ext
  const logoPath = `branding/${orgId}/logo.${ext}`

  // 旧logo_pathが別なら消す（拡張子変更でゴミが残るのを防ぐ）
  const { data: cur, error: curErr } = await supabase
    .from('user_settings')
    .select('logo_path')
    .eq('org_id', orgId)
    .maybeSingle()

  const oldPath = curErr ? '' : String((cur as any)?.logo_path ?? '')
  if (oldPath && oldPath !== logoPath) {
    try {
      const service = createServiceSupabase()
      await service.storage.from('branding').remove([oldPath]).catch(() => {})
    } catch {}
  }

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

  // user_settings：org単位で upsert（onConflict: org_id）
  const now = new Date().toISOString()
  const { error: dbErr } = await supabase.from('user_settings').upsert(
    {
      org_id: orgId,
      user_id: userId, // 最後に更新した人（用途自由）
      logo_path: logoPath,
      logo_mime: mime,
      updated_at: now,
    },
    { onConflict: 'org_id' }
  )

  if (dbErr) return respondJson(cookiesToSet, { error: 'user_settings upsert failed: ' + dbErr.message }, { status: 500 })

  return respondJson(cookiesToSet, { ok: true, logo: { path: logoPath, mime } }, { status: 200 })
}

export async function DELETE(req: NextRequest) {
  const { supabase, cookiesToSet } = createSupabase(req)

  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) {
    return respondJson(cookiesToSet, { error: userErr?.message ?? 'Not authenticated' }, { status: 401 })
  }

  const userId = userData.user.id
  let orgId: string
  try {
    orgId = await getCurrentOrgId(supabase as any, userId)
  } catch (e: any) {
    return respondJson(cookiesToSet, { error: e?.message ?? 'org not found' }, { status: 500 })
  }

  const { data: settings, error } = await supabase.from('user_settings').select('logo_path').eq('org_id', orgId).maybeSingle()
  if (error) return respondJson(cookiesToSet, { error: error.message }, { status: 500 })

  const logoPath = String((settings as any)?.logo_path ?? '')

  if (logoPath) {
    try {
      const service = createServiceSupabase()
      await service.storage.from('branding').remove([logoPath]).catch(() => {})
    } catch {}
  }

  const now = new Date().toISOString()
  const { error: updErr } = await supabase.from('user_settings').upsert(
    { org_id: orgId, user_id: userId, logo_path: null, logo_mime: null, updated_at: now },
    { onConflict: 'org_id' }
  )

  if (updErr) return respondJson(cookiesToSet, { error: 'user_settings update failed: ' + updErr.message }, { status: 500 })

  return respondJson(cookiesToSet, { ok: true }, { status: 200 })
}