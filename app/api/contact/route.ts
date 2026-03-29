import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function json(body: any, init?: ResponseInit) {
  return NextResponse.json(body, init)
}

function isValidEmail(email: string) {
  return /\S+@\S+\.\S+/.test(email)
}

function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRole) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
  }

  return createAdminClient(url, serviceRole, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))

    const name = String(body?.name ?? '').trim()
    const email = String(body?.email ?? '').trim()
    const subject = String(body?.subject ?? '').trim()
    const message = String(body?.message ?? '').trim()

    if (!name) {
      return json(
        { ok: false, error: 'invalid_name', message: 'お名前を入力してください。' },
        { status: 400 }
      )
    }

    if (!email) {
      return json(
        { ok: false, error: 'invalid_email', message: 'メールアドレスを入力してください。' },
        { status: 400 }
      )
    }

    if (!isValidEmail(email)) {
      return json(
        {
          ok: false,
          error: 'invalid_email_format',
          message: 'メールアドレスの形式が正しくありません。',
        },
        { status: 400 }
      )
    }

    if (!subject) {
      return json(
        { ok: false, error: 'invalid_subject', message: '件名を入力してください。' },
        { status: 400 }
      )
    }

    if (!message) {
      return json(
        { ok: false, error: 'invalid_message', message: 'お問い合わせ内容を入力してください。' },
        { status: 400 }
      )
    }

    const admin = createSupabaseAdminClient()

    const { error } = await admin.from('contact_messages').insert({
      name,
      email,
      subject,
      message,
    })

    if (error) {
      return json(
        {
          ok: false,
          error: 'insert_failed',
          message: error.message,
        },
        { status: 500 }
      )
    }

    return json({ ok: true })
  } catch (e: any) {
    return json(
      {
        ok: false,
        error: 'contact_failed',
        message: String(e?.message ?? e ?? 'unknown error'),
      },
      { status: 500 }
    )
  }
}