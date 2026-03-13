export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Buffer } from 'node:buffer'

import { respondJson } from '@/lib/api/response'
import { createSupabaseServerClient } from '@/lib/api/supabase-server'
import { withDebug } from '@/lib/debug'
import { requireCurrentOrgId } from '@/lib/org/getCurrentOrgId'

function createServiceSupabase() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  if (!serviceKey) throw new Error('Missing env: SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, serviceKey, { auth: { persistSession: false } })
}

const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp'])

export async function GET(req: NextRequest) {
  const { supabase, cookiesToSet } = createSupabaseServerClient(req)

  const respond = (body: any, init?: ResponseInit) => {
    return respondJson(cookiesToSet, body, init)
  }

  const respondErr = (
    error: string,
    message: string,
    status = 500,
    debug?: Record<string, unknown>
  ) => {
    return respond(
      {
        error,
        message,
        ...withDebug(debug),
      },
      { status }
    )
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

  const { data: settings, error } = await supabase
    .from('user_settings')
    .select('logo_path, logo_mime')
    .eq('org_id', orgId)
    .maybeSingle()

  if (error) {
    return respondErr(
      'branding_fetch_failed',
      'ロゴ設定の取得に失敗しました。時間をおいて再実行してください。',
      500,
      { detail: error.message, orgId }
    )
  }

  const logoPath = String((settings as any)?.logo_path ?? '')
  const logoMime = String((settings as any)?.logo_mime ?? '')

  if (!logoPath) {
    return respond({ logo: null }, { status: 200 })
  }

  return respond({ logo: { path: logoPath, mime: logoMime } }, { status: 200 })
}

export async function POST(req: NextRequest) {
  const { supabase, cookiesToSet } = createSupabaseServerClient(req)

  const respond = (body: any, init?: ResponseInit) => {
    return respondJson(cookiesToSet, body, init)
  }

  const respondErr = (
    error: string,
    message: string,
    status = 500,
    debug?: Record<string, unknown>
  ) => {
    return respond(
      {
        error,
        message,
        ...withDebug(debug),
      },
      { status }
    )
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

  let file: File | null = null
  try {
    const form = await req.formData()
    file = (form.get('file') as any) ?? null
  } catch {
    return respondErr(
      'invalid_multipart',
      'アップロード内容が不正です。multipart/form-data を確認してください。',
      400
    )
  }

  if (!file || typeof (file as any).arrayBuffer !== 'function') {
    return respondErr(
      'file_required',
      'ファイルが必要です（field name: file）。',
      400
    )
  }

  const mime = String((file as any).type ?? '').toLowerCase()
  if (!ALLOWED_MIME.has(mime)) {
    return respondErr(
      'unsupported_file_type',
      '対応していない画像形式です。PNG / JPEG / WebP を使用してください。',
      400,
      { detail: mime }
    )
  }

  const size = Number((file as any).size ?? 0)
  if (size <= 0) {
    return respondErr('empty_file', '空のファイルはアップロードできません。', 400)
  }
  if (size > 2 * 1024 * 1024) {
    return respondErr('file_too_large', 'ファイルサイズが大きすぎます（最大 2MB）。', 413)
  }

  const extByMime: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
  }

  const ext = extByMime[mime]
  if (!ext) {
    return respondErr(
      'unsupported_file_type',
      '対応していない画像形式です。',
      400,
      { detail: mime }
    )
  }

  const logoPath = `branding/${orgId}/logo.${ext}`

  const { data: cur, error: curErr } = await supabase
    .from('user_settings')
    .select('logo_path')
    .eq('org_id', orgId)
    .maybeSingle()

  if (curErr) {
    return respondErr(
      'branding_fetch_failed',
      '現在のロゴ設定の取得に失敗しました。時間をおいて再実行してください。',
      500,
      { detail: curErr.message, orgId }
    )
  }

  const oldPath = String((cur as any)?.logo_path ?? '')
  if (oldPath && oldPath !== logoPath) {
    try {
      const service = createServiceSupabase()
      await service.storage.from('branding').remove([oldPath]).catch(() => {})
    } catch {}
  }

  const buf = Buffer.from(await (file as any).arrayBuffer())

  try {
    const service = createServiceSupabase()
    const { error: upErr } = await service.storage.from('branding').upload(logoPath, buf, {
      contentType: mime,
      upsert: true,
    })

    if (upErr) {
      return respondErr(
        'storage_upload_failed',
        'ロゴ画像の保存に失敗しました。時間をおいて再実行してください。',
        500,
        { detail: upErr.message, orgId, logoPath }
      )
    }
  } catch (e: any) {
    return respondErr(
      'storage_upload_failed',
      'ロゴ画像の保存に失敗しました。時間をおいて再実行してください。',
      500,
      { detail: e?.message ?? 'Storage upload failed', orgId, logoPath }
    )
  }

  const now = new Date().toISOString()
  const { error: dbErr } = await supabase.from('user_settings').upsert(
    {
      org_id: orgId,
      user_id: userId,
      logo_path: logoPath,
      logo_mime: mime,
      updated_at: now,
    },
    { onConflict: 'org_id' }
  )

  if (dbErr) {
    return respondErr(
      'branding_upsert_failed',
      'ロゴ設定の保存に失敗しました。時間をおいて再実行してください。',
      500,
      { detail: dbErr.message, orgId, logoPath, mime }
    )
  }

  return respond({ ok: true, logo: { path: logoPath, mime } }, { status: 200 })
}

export async function DELETE(req: NextRequest) {
  const { supabase, cookiesToSet } = createSupabaseServerClient(req)

  const respond = (body: any, init?: ResponseInit) => {
    return respondJson(cookiesToSet, body, init)
  }

  const respondErr = (
    error: string,
    message: string,
    status = 500,
    debug?: Record<string, unknown>
  ) => {
    return respond(
      {
        error,
        message,
        ...withDebug(debug),
      },
      { status }
    )
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

  const { data: settings, error } = await supabase
    .from('user_settings')
    .select('logo_path')
    .eq('org_id', orgId)
    .maybeSingle()

  if (error) {
    return respondErr(
      'branding_fetch_failed',
      'ロゴ設定の取得に失敗しました。時間をおいて再実行してください。',
      500,
      { detail: error.message, orgId }
    )
  }

  const logoPath = String((settings as any)?.logo_path ?? '')

  if (logoPath) {
    try {
      const service = createServiceSupabase()
      await service.storage.from('branding').remove([logoPath]).catch(() => {})
    } catch {}
  }

  const now = new Date().toISOString()
  const { error: updErr } = await supabase.from('user_settings').upsert(
    {
      org_id: orgId,
      user_id: userId,
      logo_path: null,
      logo_mime: null,
      updated_at: now,
    },
    { onConflict: 'org_id' }
  )

  if (updErr) {
    return respondErr(
      'branding_update_failed',
      'ロゴ設定の削除に失敗しました。時間をおいて再実行してください。',
      500,
      { detail: updErr.message, orgId }
    )
  }

  return respond({ ok: true }, { status: 200 })
}