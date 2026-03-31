import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function json(body: any, init?: ResponseInit) {
  return NextResponse.json(body, init)
}

function isValidEmail(email: string) {
  return /\S+@\S+\.\S+/.test(email)
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
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

function getResendConfig() {
  const apiKey = process.env.RESEND_API_KEY
  const to = process.env.CONTACT_TO_EMAIL
  const from = process.env.CONTACT_FROM_EMAIL

  if (!apiKey || !to || !from) {
    return null
  }

  return {
    resend: new Resend(apiKey),
    to,
    from,
  }
}

function buildNotificationText(input: {
  name: string
  email: string
  subject: string
  message: string
}) {
  return [
    'お問い合わせが送信されました。',
    '',
    `名前: ${input.name}`,
    `メールアドレス: ${input.email}`,
    `件名: ${input.subject}`,
    '',
    '本文:',
    input.message,
  ].join('\n')
}

function buildNotificationHtml(input: {
  name: string
  email: string
  subject: string
  message: string
}) {
  return `
    <div style="font-family: Arial, 'Hiragino Kaku Gothic ProN', Meiryo, sans-serif; line-height: 1.7; color: #111;">
      <h2 style="margin: 0 0 16px;">お問い合わせが送信されました</h2>

      <table style="border-collapse: collapse; width: 100%; max-width: 720px;">
        <tbody>
          <tr>
            <td style="padding: 8px 12px; border: 1px solid #ddd; width: 180px; background: #f8f8f8;">名前</td>
            <td style="padding: 8px 12px; border: 1px solid #ddd;">${escapeHtml(input.name)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border: 1px solid #ddd; background: #f8f8f8;">メールアドレス</td>
            <td style="padding: 8px 12px; border: 1px solid #ddd;">${escapeHtml(input.email)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border: 1px solid #ddd; background: #f8f8f8;">件名</td>
            <td style="padding: 8px 12px; border: 1px solid #ddd;">${escapeHtml(input.subject)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border: 1px solid #ddd; background: #f8f8f8; vertical-align: top;">本文</td>
            <td style="padding: 8px 12px; border: 1px solid #ddd; white-space: pre-wrap;">${escapeHtml(input.message)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  `
}

async function sendAdminNotification(input: {
  name: string
  email: string
  subject: string
  message: string
}) {
  const config = getResendConfig()

  if (!config) {
    return {
      ok: false,
      skipped: true,
      reason: 'missing_env',
    } as const
  }

  const { data, error } = await config.resend.emails.send({
    from: config.from,
    to: [config.to],
    subject: `【お問い合わせ】${input.subject}`,
    replyTo: input.email,
    text: buildNotificationText(input),
    html: buildNotificationHtml(input),
  })

  if (error) {
    throw new Error(error.message)
  }

  return {
    ok: true,
    skipped: false,
    emailId: data?.id ?? null,
  } as const
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

    let notified = false
    let notificationError: string | null = null

    try {
      const notifyResult = await sendAdminNotification({
        name,
        email,
        subject,
        message,
      })

      notified = notifyResult.ok
    } catch (e: any) {
      notificationError = String(e?.message ?? e ?? 'unknown error')
      console.error('[contact] resend send failed:', e)
    }

    return json({
      ok: true,
      notified,
      ...(process.env.NODE_ENV !== 'production' && notificationError
        ? { notificationError }
        : {}),
    })
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