import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrgId } from '@/lib/org/getCurrentOrgId'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Props = { params: { ym: string } | Promise<{ ym: string }> }

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isYm(v: string) {
  return /^\d{4}-\d{2}$/.test(v)
}

function nextYm(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1, 1))
  d.setUTCMonth(d.getUTCMonth() + 1)
  const yy = d.getUTCFullYear()
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${yy}-${mm}`
}

export default async function MonthlyDetailPage({ params }: Props) {
  const p = await Promise.resolve(params)
  const ym = String((p as any).ym ?? '')

  if (!isYm(ym)) {
    return (
      <div style={{ maxWidth: 980, margin: '40px auto', fontFamily: 'sans-serif' }}>
        <h1>月別明細</h1>
        <p style={{ color: 'crimson' }}>Invalid ym: {ym}</p>
        <Link href="/dashboard/monthly">Back</Link>
      </div>
    )
  }

  const supabase = await createClient()
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) redirect('/login')

  const userId = userData.user.id

  // ✅ current org を確定（profiles直読みは lib に集約）
  let orgId: string
  try {
    orgId = await getCurrentOrgId(supabase as any, userId)
    if (!UUID_RE.test(orgId)) throw new Error('current_org_id invalid')
  } catch (e: any) {
    return (
      <div style={{ maxWidth: 980, margin: '40px auto', fontFamily: 'sans-serif' }}>
        <h1>月別明細 {ym}</h1>
        <p style={{ color: 'crimson' }}>Error: {e?.message ?? 'org not found'}</p>
        <Link href="/dashboard/monthly">Back</Link>
      </div>
    )
  }

  // issued_at が timestamptz（UTC保存）でも月境界がズレないように JST(+09:00) を明示
  const from = `${ym}-01T00:00:00+09:00`
  const to = `${nextYm(ym)}-01T00:00:00+09:00`

  // ✅ issued のみ（月内） + orgで絞る
  const { data: docs, error } = await supabase
    .from('documents')
    .select('id, document_no, issued_at, currency, subtotal_amount, tax_amount, total_amount, customer_id')
    .eq('org_id', orgId)
    .eq('status', 'issued')
    .gte('issued_at', from)
    .lt('issued_at', to)
    .order('issued_at', { ascending: false })

  if (error) {
    return (
      <div style={{ maxWidth: 980, margin: '40px auto', fontFamily: 'sans-serif' }}>
        <h1>月別明細 {ym}</h1>
        <p style={{ color: 'crimson' }}>Error: {error.message}</p>
        <Link href="/dashboard/monthly">Back</Link>
      </div>
    )
  }

  const list = (docs ?? []) as Array<any>

  // customer 名をまとめて取得（customer_id があれば）
  const customerIds = Array.from(
    new Set(list.map((d) => String(d.customer_id ?? '')).filter((x) => x && x !== 'null'))
  )

  const customerNameById = new Map<string, string>()
  if (customerIds.length > 0) {
    const { data: customers, error: cusErr } = await supabase
      .from('customers')
      .select('id, name')
      .in('id', customerIds)
      .eq('org_id', orgId)

    if (cusErr) {
      return (
        <div style={{ maxWidth: 980, margin: '40px auto', fontFamily: 'sans-serif' }}>
          <h1>月別明細 {ym}</h1>
          <p style={{ color: 'crimson' }}>Error: customers load failed: {cusErr.message}</p>
          <Link href="/dashboard/monthly">Back</Link>
        </div>
      )
    }

    for (const c of customers ?? []) {
      customerNameById.set(String((c as any).id), String((c as any).name ?? ''))
    }
  }

  const fmtDate = (v: any) => (v ? new Date(v).toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' }) : '')

  // 数値フォーマット（「1,234」形式）
  const fmt = (n: number) => new Intl.NumberFormat('ja-JP').format(Number(n ?? 0))

  // 合計（通貨別）
  const agg = new Map<string, { docs: number; subtotal: number; tax: number; total: number }>()
  for (const d of list) {
    const cur = String(d.currency ?? 'JPY')
    const prev = agg.get(cur) ?? { docs: 0, subtotal: 0, tax: 0, total: 0 }
    agg.set(cur, {
      docs: prev.docs + 1,
      subtotal: prev.subtotal + Number(d.subtotal_amount ?? 0),
      tax: prev.tax + Number(d.tax_amount ?? 0),
      total: prev.total + Number(d.total_amount ?? 0),
    })
  }

  return (
    <div style={{ maxWidth: 980, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h1>月別明細 {ym}</h1>

        <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
          {/* ✅ CSVダウンロード（Route Handler /dashboard/monthly/[ym]/export に投げる） */}
          <a href={`/dashboard/monthly/${ym}/export`} style={{ textDecoration: 'underline' }}>
            CSVダウンロード
          </a>

          <Link href="/dashboard/monthly">月次集計に戻る</Link>
        </div>
      </div>

      <div style={{ marginBottom: 14, padding: 12, border: '1px solid #eee', borderRadius: 8 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>この月の合計（通貨別）</div>
        {[...agg.entries()].map(([cur, t]) => (
          <div key={cur} style={{ marginBottom: 6 }}>
            {cur}：件数 {fmt(t.docs)} / 小計 {fmt(t.subtotal)} / 税 {fmt(t.tax)} / 合計 <b>{fmt(t.total)}</b>
          </div>
        ))}
        {agg.size === 0 && <div style={{ color: '#666' }}>対象データがありません</div>}
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={th}>発行日</th>
            <th style={th}>発行番号</th>
            <th style={th}>顧客</th>
            <th style={th}>通貨</th>
            <th style={{ ...th, textAlign: 'right' }}>小計</th>
            <th style={{ ...th, textAlign: 'right' }}>税</th>
            <th style={{ ...th, textAlign: 'right' }}>合計</th>
            <th style={th}>リンク</th>
          </tr>
        </thead>
        <tbody>
          {list.map((d) => {
            const custId = String(d.customer_id ?? '')
            const custName = customerNameById.get(custId) || ''
            return (
              <tr key={d.id}>
                <td style={td}>{fmtDate(d.issued_at)}</td>
                <td style={td}>{String(d.document_no ?? d.id).slice(0, 24)}</td>
                <td style={td}>{custName || (custId ? custId.slice(0, 8) + '…' : '-')}</td>
                <td style={td}>{d.currency}</td>
                <td style={{ ...td, textAlign: 'right' }}>{fmt(d.subtotal_amount)}</td>
                <td style={{ ...td, textAlign: 'right' }}>{fmt(d.tax_amount)}</td>
                <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{fmt(d.total_amount)}</td>
                <td style={td}>
                  <Link href={`/documents/${d.id}`}>開く</Link>
                </td>
              </tr>
            )
          })}

          {list.length === 0 && (
            <tr>
              <td style={td} colSpan={8}>
                No data.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

const th = { textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 } as const
const td = { borderBottom: '1px solid #eee', padding: 8, verticalAlign: 'top' } as const