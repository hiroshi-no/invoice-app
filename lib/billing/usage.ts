import type { SupabaseClient } from '@supabase/supabase-js'

export type UsageRow = {
  id: string
  org_id: string
  year_month: string
  issued_count: number
  saved_pdf_count: number
}

function getCurrentYearMonthJst(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(date)

  const year = parts.find((p) => p.type === 'year')?.value
  const month = parts.find((p) => p.type === 'month')?.value

  if (!year || !month) {
    throw new Error('Failed to format JST year_month')
  }

  return `${year}-${month}`
}

export function getCurrentUsageYearMonth() {
  return getCurrentYearMonthJst()
}

export async function getUsageRow(
  supabase: SupabaseClient,
  orgId: string,
  yearMonth = getCurrentYearMonthJst()
): Promise<UsageRow | null> {
  const { data, error } = await supabase
    .from('usage_counters')
    .select('id, org_id, year_month, issued_count, saved_pdf_count')
    .eq('org_id', orgId)
    .eq('year_month', yearMonth)
    .maybeSingle<UsageRow>()

  if (error) throw error
  return data ?? null
}

export async function ensureUsageRow(
  supabase: SupabaseClient,
  orgId: string,
  yearMonth = getCurrentYearMonthJst()
): Promise<UsageRow> {
  const existing = await getUsageRow(supabase, orgId, yearMonth)
  if (existing) return existing

  const { data, error } = await supabase
    .from('usage_counters')
    .insert({
      org_id: orgId,
      year_month: yearMonth,
      issued_count: 0,
      saved_pdf_count: 0,
    })
    .select('id, org_id, year_month, issued_count, saved_pdf_count')
    .single<UsageRow>()

  if (!error && data) return data

  // 同時実行で unique 制約に当たった場合を想定して再取得
  const retry = await getUsageRow(supabase, orgId, yearMonth)
  if (retry) return retry

  throw error ?? new Error('Failed to ensure usage_counters row')
}

export async function incrementIssuedCount(
  supabase: SupabaseClient,
  orgId: string
) {
  const row = await ensureUsageRow(supabase, orgId)
  const nextValue = (row.issued_count ?? 0) + 1

  const { error } = await supabase
    .from('usage_counters')
    .update({ issued_count: nextValue })
    .eq('id', row.id)

  if (error) throw error
}

export async function incrementSavedPdfCount(
  supabase: SupabaseClient,
  orgId: string
) {
  const row = await ensureUsageRow(supabase, orgId)
  const nextValue = (row.saved_pdf_count ?? 0) + 1

  const { error } = await supabase
    .from('usage_counters')
    .update({ saved_pdf_count: nextValue })
    .eq('id', row.id)

  if (error) throw error
}