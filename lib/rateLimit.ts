import { NextResponse } from 'next/server'

export async function enforceRateLimit(
  supabase: any,
  action: string,
  limit: number,
  windowSeconds: number
) {
  const { data, error } = await supabase.rpc('check_rate_limit', {
    p_action: action,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  })

  if (error) {
    // レート制限自体が落ちても致命停止しない（必要なら 500 にしてもOK）
    console.error('[rate_limit] rpc failed', error)
    return null
  }

  const allowed = !!data?.allowed
  if (allowed) return null

  const resetAt = data?.reset_at ? new Date(data.reset_at) : null
  const retryAfter = resetAt ? Math.max(0, Math.ceil((resetAt.getTime() - Date.now()) / 1000)) : windowSeconds

  return NextResponse.json(
    {
      error: 'rate_limited',
      action,
      limit: data?.limit ?? limit,
      remaining: data?.remaining ?? 0,
      retry_after: retryAfter,
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
        'Cache-Control': 'no-store',
      },
    }
  )
}