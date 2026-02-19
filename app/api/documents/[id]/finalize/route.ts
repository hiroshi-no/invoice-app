export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

type RouteContext =
  | { params: { id: string } }
  | { params: Promise<{ id: string }> }

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

// Set-Cookie の "name=value" を cookie ヘッダ文字列に反映（MVP版）
function mergeSetCookieIntoCookieHeader(cookieHeader: string, setCookies: string[]) {
  const map = new Map<string, string>()

  cookieHeader
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((pair) => {
      const i = pair.indexOf('=')
      if (i > 0) map.set(pair.slice(0, i), pair.slice(i + 1))
    })

  for (const sc of setCookies) {
    const first = sc.split(';')[0] // name=value
    const i = first.indexOf('=')
    if (i > 0) map.set(first.slice(0, i), first.slice(i + 1))
  }

  return Array.from(map.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join('; ')
}

// Node runtime の fetch は getSetCookie があることが多いが、無い場合もあるので吸収
function getSetCookies(res: Response): string[] {
  // @ts-ignore
  if (typeof (res.headers as any).getSetCookie === 'function') {
    // @ts-ignore
    return (res.headers as any).getSetCookie() as string[]
  }

  // fallback: 1本だけ取れる環境もある（複数は取り切れない可能性あり）
  const sc = res.headers.get('set-cookie')
  return sc ? [sc] : []
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const params = await Promise.resolve((ctx as any).params)
  const documentId = String((params as any).id ?? '')

  if (!UUID_RE.test(documentId)) {
    return NextResponse.json({ error: 'Invalid document id' }, { status: 400 })
  }

  // ✅ items hash 必須（pdf/save の 409 ガードのため）
  const itemsHash = (req.headers.get('x-items-hash') ?? '').trim().toLowerCase()
  if (!itemsHash) {
    return NextResponse.json({ error: 'Precondition required: x-items-hash' }, { status: 428 })
  }

  const origin = new URL(req.url).origin

  // 元の cookie（この finalize を叩いたユーザーのセッションを下流へ渡す）
  let cookieHeader = req.headers.get('cookie') ?? ''

  // クライアントへ返す set-cookie を溜める
  const setCookiesToClient: string[] = []

  const callJson = async (path: string, step: string) => {
    const url = new URL(path, origin).toString()

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        cookie: cookieHeader,
        'x-items-hash': itemsHash,
        'x-confirm-saved-items': '1',
      },
      cache: 'no-store',
    })

    const setCookies = getSetCookies(res)
    if (setCookies.length) {
      setCookiesToClient.push(...setCookies)
      cookieHeader = mergeSetCookieIntoCookieHeader(cookieHeader, setCookies)
    }

    const json = await res.json().catch(() => ({}))
    return { res, json, step }
  }

  // 1) Issue
  const step1 = await callJson(`/api/documents/${documentId}/issue`, 'issue')
  if (!step1.res.ok) {
    const out = NextResponse.json(
      { error: step1.json.error ?? 'ISSUE failed', step: step1.step, detail: step1.json },
      { status: step1.res.status }
    )
    for (const sc of setCookiesToClient) out.headers.append('set-cookie', sc)
    return out
  }

  // 2) PDF save
  const step2 = await callJson(`/api/documents/${documentId}/pdf/save`, 'pdf/save')
  if (!step2.res.ok) {
    const out = NextResponse.json(
      { error: step2.json.error ?? 'PDF save failed', step: step2.step, detail: step2.json },
      { status: step2.res.status }
    )
    for (const sc of setCookiesToClient) out.headers.append('set-cookie', sc)
    return out
  }

  const out = NextResponse.json({ ok: true, issue: step1.json, pdf: step2.json }, { status: 200 })
  for (const sc of setCookiesToClient) out.headers.append('set-cookie', sc)
  return out
}
