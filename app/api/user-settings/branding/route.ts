// app/api/user-settings/branding/route.ts
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/api/supabase-server'
import { respondJson } from '@/lib/api/response'
import { withDebug } from '@/lib/debug'
import { requireCurrentOrgId } from '@/lib/org/getCurrentOrgId'
import { loadOrgBranding } from '@/lib/pdf/branding'

function pickNonEmptyString(v: any, fallback = '') {
  const s = String(v ?? '').trim()
  return s ? s : fallback
}

type TemplateKey = 'classic' | 'minimal' | 'modern' | 'elegant' | 'corporate'

function pickTemplateKey(v: any): TemplateKey {
  const s = String(v ?? '').trim().toLowerCase()

  switch (s) {
    case 'minimal':
    case 'modern':
    case 'elegant':
    case 'corporate':
    case 'classic':
      return s
    default:
      return 'classic'
  }
}

function normalizeColor(v: any) {
  const s = String(v ?? '').trim()
  if (/^#[0-9a-fA-F]{6}$/.test(s)) return s
  return '#111827'
}

export async function GET(req: NextRequest) {
  const { supabase, cookiesToSet } = createSupabaseServerClient(req)

  const current = await requireCurrentOrgId(supabase as any)
  if (!current.ok) {
    return respondJson(cookiesToSet, current.body, { status: current.status })
  }

  try {
    const branding = await loadOrgBranding(supabase as any, current.orgId)
    return respondJson(cookiesToSet, { branding }, { status: 200 })
  } catch (e: any) {
    return respondJson(
      cookiesToSet,
      {
        error: 'branding_fetch_failed',
        message: 'ブランディング設定の取得に失敗しました。',
        ...withDebug({ detail: e?.message ?? String(e) }),
      },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest) {
  const { supabase, cookiesToSet } = createSupabaseServerClient(req)

  const current = await requireCurrentOrgId(supabase as any)
  if (!current.ok) {
    return respondJson(cookiesToSet, current.body, { status: current.status })
  }

  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) {
    return respondJson(
      cookiesToSet,
      {
        error: 'not_authenticated',
        message: 'ログインが切れました。再ログインしてください。',
        ...withDebug({ detail: userErr?.message }),
      },
      { status: 401 }
    )
  }

  const body = await req.json().catch(() => ({}))
  const now = new Date().toISOString()

const commonPayload = {
  brand_color: normalizeColor(body?.brandColor),
  template_key: pickTemplateKey(body?.templateKey),
  footer_text: String(body?.footerText ?? ''),
  issuer_name: pickNonEmptyString(body?.issuerName),
  issuer_postal_code: pickNonEmptyString(body?.issuerPostalCode),
  issuer_address1: pickNonEmptyString(body?.issuerAddress1),
  issuer_address2: pickNonEmptyString(body?.issuerAddress2),
  issuer_email: pickNonEmptyString(body?.issuerEmail),
  issuer_phone: pickNonEmptyString(body?.issuerPhone),
  issuer_fax: pickNonEmptyString(body?.issuerFax),
  updated_at: now,
}

  // まず update を試す
  const { data: updatedRows, error: updateErr } = await supabase
    .from('user_settings')
    .update(commonPayload)
    .eq('org_id', current.orgId)
    .select('org_id')

  if (updateErr) {
    return respondJson(
      cookiesToSet,
      {
        error: 'branding_update_failed',
        message: 'ブランディング設定の更新に失敗しました。',
        ...withDebug({ detail: updateErr.message }),
      },
      { status: 500 }
    )
  }

  // 既存行があれば完了
  if ((updatedRows ?? []).length > 0) {
    return respondJson(cookiesToSet, { ok: true, mode: 'update' }, { status: 200 })
  }

  // なければ insert
  const insertPayload = {
    org_id: current.orgId,
    user_id: userData.user.id,
    ...commonPayload,
    created_at: now,
  }

  const { error: insertErr } = await supabase
    .from('user_settings')
    .insert(insertPayload)

  if (insertErr) {
    return respondJson(
      cookiesToSet,
      {
        error: 'branding_insert_failed',
        message: 'ブランディング設定の新規保存に失敗しました。',
        ...withDebug({ detail: insertErr.message }),
      },
      { status: 500 }
    )
  }

  return respondJson(cookiesToSet, { ok: true, mode: 'insert' }, { status: 200 })
}