// app/api/documents/[id]/finalize/route.ts
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'

import { applyCookies, respondJson } from '@/lib/api/response'
import { createSupabaseServerClient } from '@/lib/api/supabase-server'
import { withDebug } from '@/lib/debug'
import { enforceRateLimit } from '@/lib/rateLimit'

type RouteContext =
  | { params: { id: string } }
  | { params: Promise<{ id: string }> }

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

async function readJsonOrText(res: Response) {
  const text = await res.text().catch(() => '')
  const json = (() => {
    try {
      return JSON.parse(text)
    } catch {
      return null
    }
  })()
  return { text, json }
}

function isItemsNotSaved(payload: any) {
  const d = payload?.detail ?? payload
  return payload?.error === 'items_not_saved' || d?.error === 'items_not_saved'
}

function friendlyMessage(stage: 'issue' | 'pdf', status: number, detail: any) {
  if (isItemsNotSaved({ detail })) {
    return '明細が未保存です。編集画面で「保存」してから再実行してください。'
  }
  if (status === 404) return '対象が見つかりません。画面を更新して再実行してください。'
  if (status === 401) return 'ログインが切れました。再ログインしてください。'
  if (status === 428) {
    return '保存確認（明細ハッシュ）が必要です。編集画面で保存してから再実行してください。'
  }
  if (status >= 500) {
    return stage === 'pdf'
      ? 'PDF保存に失敗しました。時間をおいて再実行してください。'
      : '発行に失敗しました。時間をおいて再実行してください。'
  }
  return stage === 'pdf' ? 'PDF保存に失敗しました。' : '発行に失敗しました。'
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const params = await Promise.resolve((ctx as any).params)
  const documentId = String((params as any).id ?? '')

  if (!UUID_RE.test(documentId)) {
    const res = NextResponse.json(
      { ok: false, error: 'invalid_document_id', message: '不正なドキュメントIDです。' },
      { status: 400 }
    )
    res.headers.set('Cache-Control', 'no-store')
    return res
  }

  const { supabase, cookiesToSet } = createSupabaseServerClient(req)

  const withCookies = (res: NextResponse) => applyCookies(res, cookiesToSet)

  const respondErr = (
    error: string,
    message: string,
    status = 500,
    debug?: Record<string, unknown>
  ) => {
    return respondJson(
      cookiesToSet,
      {
        ok: false,
        error,
        message,
        ...withDebug(debug),
      },
      { status }
    )
  }

  try {
    const { data: userData, error: userErr } = await supabase.auth.getUser()
    if (userErr || !userData.user) {
      return respondErr(
        'not_authenticated',
        'ログインが切れました。再ログインしてください。',
        401,
        { detail: userErr?.message }
      )
    }

    const limited = await enforceRateLimit(supabase, 'finalize', 10, 60)
    if (limited) return withCookies(limited as NextResponse)

    const clientHash = (req.headers.get('x-items-hash') ?? '').trim().toLowerCase()
    if (!clientHash) {
      return respondErr(
        'precondition_required',
        '明細ハッシュが必要です。編集画面で保存してから再実行してください。',
        428
      )
    }

    const confirm = (req.headers.get('x-confirm-saved-items') ?? '').trim()
    if (!confirm) {
      return respondErr(
        'precondition_required',
        '保存済み確認が必要です（x-confirm-saved-items）。',
        428
      )
    }

    const origin = new URL(req.url).origin
    const cookie = req.headers.get('cookie') ?? ''

    const baseHeaders: Record<string, string> = {
      cookie,
      'x-internal-call': '1',
      'x-items-hash': clientHash,
      'x-confirm-saved-items': confirm,
    }

    const issueRes = await fetch(`${origin}/api/documents/${documentId}/issue`, {
      method: 'POST',
      headers: baseHeaders,
      cache: 'no-store',
    })

    const issueParsed = await readJsonOrText(issueRes)

    if (!issueRes.ok) {
      const detail = issueParsed.json ?? { raw: issueParsed.text }

      return respondJson(
        cookiesToSet,
        {
          ok: false,
          error: 'issue_failed',
          message: friendlyMessage('issue', issueRes.status, detail),
          ...withDebug({ detail }),
        },
        { status: issueRes.status }
      )
    }

    const pdfRes = await fetch(`${origin}/api/documents/${documentId}/pdf/save`, {
      method: 'POST',
      headers: baseHeaders,
      cache: 'no-store',
    })

    const pdfParsed = await readJsonOrText(pdfRes)

    if (!pdfRes.ok) {
      const detail = pdfParsed.json ?? { raw: pdfParsed.text }

      return respondJson(
        cookiesToSet,
        {
          ok: false,
          error: 'pdf_save_failed',
          message: friendlyMessage('pdf', pdfRes.status, detail),
          ...withDebug({
            issue: issueParsed.json ?? { raw: issueParsed.text },
            detail,
          }),
        },
        { status: pdfRes.status }
      )
    }

    return respondJson(
      cookiesToSet,
      {
        ok: true,
        issue: issueParsed.json ?? { raw: issueParsed.text },
        pdf: pdfParsed.json ?? { raw: issueParsed.text },
      },
      { status: 200 }
    )
  } catch (e: any) {
    return respondErr(
      'finalize_failed',
      '発行処理に失敗しました。時間をおいて再実行してください。',
      500,
      { detail: e?.message ?? String(e) }
    )
  }
}