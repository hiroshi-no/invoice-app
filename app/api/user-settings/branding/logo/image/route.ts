export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Buffer } from 'node:buffer'

import { applyCookies, respondJson } from '@/lib/api/response'
import { createSupabaseServerClient } from '@/lib/api/supabase-server'
import { withDebug } from '@/lib/debug'
import { requireCurrentOrgId } from '@/lib/org/getCurrentOrgId'

function createServiceSupabase() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  if (!serviceKey) throw new Error('Missing env: SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, serviceKey, { auth: { persistSession: false } })
}

export async function GET(req: NextRequest) {
  const { supabase, cookiesToSet } = createSupabaseServerClient(req)

  const withCookies = (res: NextResponse) => applyCookies(res, cookiesToSet)

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

  const { data: settings, error: sErr } = await supabase
    .from('user_settings')
    .select('logo_path, logo_mime')
    .eq('org_id', orgId)
    .maybeSingle()

  if (sErr) {
    return respondErr(
      'branding_fetch_failed',
      'ロゴ設定の取得に失敗しました。時間をおいて再実行してください。',
      500,
      { detail: sErr.message, orgId }
    )
  }

  const logoPath = String((settings as any)?.logo_path ?? '')
  const logoMime = String((settings as any)?.logo_mime ?? '')

  if (!logoPath) {
    const res = new NextResponse(null, {
      status: 204,
      headers: {
        'Cache-Control': 'no-store',
      },
    })
    return withCookies(res)
  }

  let blob: Blob | null = null
  try {
    const service = createServiceSupabase()
    const { data, error: dlErr } = await service.storage.from('branding').download(logoPath)

    if (dlErr || !data) {
      return respondErr(
        'logo_not_found',
        'ロゴ画像が見つかりません。',
        404,
        { detail: dlErr?.message ?? 'logo download failed', orgId, logoPath }
      )
    }

    blob = data
  } catch (e: any) {
    return respondErr(
      'logo_download_failed',
      'ロゴ画像の取得に失敗しました。時間をおいて再実行してください。',
      500,
      { detail: e?.message ?? 'logo download failed', orgId, logoPath }
    )
  }

  const ab = await blob.arrayBuffer()
  const buf = Buffer.from(ab)
  const mime = logoMime || (blob as any).type || 'application/octet-stream'

  const res = new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': mime,
      'Cache-Control': 'no-store',
    },
  })

  return withCookies(res)
}