export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { enforceRateLimit } from '@/lib/rateLimit'
import { withDebug } from '@/lib/debug'

type RouteContext =
  | { params: { id: string } }
  | { params: Promise<{ id: string }> }

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

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

function respondJson(cookiesToSet: any[], body: any, init?: ResponseInit) {
  const res = NextResponse.json(body, init)
  for (const c of cookiesToSet) res.cookies.set(c.name, c.value, c.options)
  res.headers.set('Cache-Control', 'no-store')
  return res
}

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
  if (status === 428) return '保存確認（明細ハッシュ）が必要です。編集画面で保存してから再実行してください。'
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
    return NextResponse.json({ error: 'Invalid document id' }, { status: 400 })
  }

  const { supabase, cookiesToSet } = createSupabase(req)

  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) {
    return respondJson(cookiesToSet, { error: userErr?.message ?? 'Not authenticated' }, { status: 401 })
  }

  const limited = await enforceRateLimit(supabase, 'finalize', 10, 60)
  if (limited) return limited

  const clientHash = (req.headers.get('x-items-hash') ?? '').trim().toLowerCase()
  if (!clientHash) {
    return respondJson(
      cookiesToSet,
      { ok: false, error: 'precondition_required', message: '明細ハッシュが必要です。編集画面で保存してから再実行してください。' },
      { status: 428 }
    )
  }

  const confirm = (req.headers.get('x-confirm-saved-items') ?? '').trim()
  if (!confirm) {
    return respondJson(
      cookiesToSet,
      { ok: false, error: 'precondition_required', message: '保存済み確認が必要です（x-confirm-saved-items）。' },
      { status: 428 }
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
      pdf: pdfParsed.json ?? { raw: pdfParsed.text },
    },
    { status: 200 }
  )
}