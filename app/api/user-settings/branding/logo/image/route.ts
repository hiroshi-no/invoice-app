export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { Buffer } from 'node:buffer'
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

export async function GET(req: NextRequest) {
  const { supabase, cookiesToSet } = createSupabase(req)

  const withCookies = (res: NextResponse) => {
    for (const c of cookiesToSet) res.cookies.set(c.name, c.value, c.options)
    return res
  }

  // auth
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) {
    return withCookies(NextResponse.json({ error: userErr?.message ?? 'Not authenticated' }, { status: 401 }))
  }
  const userId = userData.user.id

  // current org（profiles直読みは lib に集約）
  let orgId: string
  try {
    orgId = await getCurrentOrgId(supabase as any, userId)
  } catch (e: any) {
    return withCookies(NextResponse.json({ error: e?.message ?? 'org not found' }, { status: 500 }))
  }

  // user_settings（org単位）
  const { data: settings, error: sErr } = await supabase
    .from('user_settings')
    .select('logo_path, logo_mime')
    .eq('org_id', orgId)
    .maybeSingle()

  if (sErr) return withCookies(NextResponse.json({ error: sErr.message }, { status: 500 }))

  const logoPath = String((settings as any)?.logo_path ?? '')
  const logoMime = String((settings as any)?.logo_mime ?? '')

  // ロゴ未設定なら 204（No Content）
  if (!logoPath) return withCookies(new NextResponse(null, { status: 204 }))

  // Storage download（Service Role）
  const service = createServiceSupabase()
  const { data: blob, error: dlErr } = await service.storage.from('branding').download(logoPath)

  if (dlErr || !blob) {
    return withCookies(NextResponse.json({ error: dlErr?.message ?? 'logo download failed' }, { status: 404 }))
  }

  const ab = await blob.arrayBuffer()
  const buf = Buffer.from(ab)
  const mime = logoMime || (blob as any).type || 'application/octet-stream'

  const res = new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': mime,
      // 変更が即反映されるように no-store（必要なら private,max-age=60 等に変更OK）
      'Cache-Control': 'no-store',
    },
  })

  return withCookies(res)
}