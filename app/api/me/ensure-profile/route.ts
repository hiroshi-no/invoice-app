export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function handler() {
  const supabase = await createClient()

  // auth
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) {
    return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  }
  const userId = userData.user.id

  // profiles 既存チェック（※ id列ではなく user_id を使う）
  const { data: prof, error: pErr } = await supabase
    .from('profiles')
    .select('current_org_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (pErr) {
    return NextResponse.json(
      { error: 'profiles_select_failed', message: pErr.message },
      { status: 500 }
    )
  }

  if (prof?.current_org_id) {
    return NextResponse.json({
      ok: true,
      existed: true,
      current_org_id: String(prof.current_org_id),
    })
  }

  // 補完：documents から org_id を推定（RLSで見える範囲）
  const { data: doc, error: dErr } = await supabase
    .from('documents')
    .select('org_id, created_at')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (dErr) {
    return NextResponse.json(
      { error: 'documents_select_failed', message: dErr.message },
      { status: 500 }
    )
  }

  const orgId = doc?.org_id ? String(doc.org_id) : ''
  if (!orgId) {
    return NextResponse.json(
      {
        error: 'org_not_found',
        message:
          'org_id を特定できません（documentsが0件等）。先に org 作成/参加 or documents 作成が必要です。',
      },
      { status: 409 }
    )
  }

  // profiles upsert
  const { data: up, error: uErr } = await supabase
    .from('profiles')
    .upsert({ user_id: userId, current_org_id: orgId }, { onConflict: 'user_id' })
    .select('current_org_id')
    .single()

  if (uErr) {
    return NextResponse.json(
      { error: 'profiles_upsert_failed', message: uErr.message },
      { status: 500 }
    )
  }

  return NextResponse.json({
    ok: true,
    existed: false,
    current_org_id: String(up.current_org_id),
  })
}

export async function POST() {
  return handler()
}

// ブラウザで叩きやすいように GET も用意（任意だけど便利）
export async function GET() {
  return handler()
}