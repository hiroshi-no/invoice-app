import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Row = {
  month: string // date (例: 2026-02-01)
  currency: string
  docs_count: number
  subtotal_amount: number
  tax_amount: number
  total_amount: number
}

function ymFromMonthValue(v: string) {
  // "2026-02-01" / "2026-02-01T00:00:00" どちらでもOKに
  return String(v ?? '').slice(0, 7)
}

function getNowYmJst() {
  // JSTで "YYYY-MM" を作る
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date())
  const y = parts.find((p) => p.type === 'year')?.value ?? String(new Date().getFullYear())
  const m = parts.find((p) => p.type === 'month')?.value ?? '01'
  return `${y}-${m}`
}

export default async function MonthlyPage({
  searchParams,
}: {
  searchParams?: { year?: string } | Promise<{ year?: string }>
}) {
  const supabase = await createClient()

  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) redirect('/login')

  const sp = await Promise.resolve(searchParams ?? {})
  const year = Number(sp.year ?? new Date().getFullYear())

  const from = `${year}-01-01`
  const to = `${year + 1}-01-01`

  const { data, error } = await supabase.rpc('get_monthly_totals', {
    p_from: from,
    p_to: to,
    p_tz: 'Asia/Tokyo',
  })

  if (error) {
    return (
      <div style={{ maxWidth: 980, margin: '40px auto', fontFamily: 'sans-serif' }}>
        <h1>月次集計</h1>
        <p style={{ color: 'crimson' }}>Error: {error.message}</p>
        <Link href="/dashboard">Back</Link>
      </div>
    )
  }

  const rows = (data ?? []) as Row[]
  const fmt = (n: number) => new Intl.NumberFormat('ja-JP').format(Number(n ?? 0))

  // =========================
  // 年間合計（通貨別）
  // =========================
  const yearAgg = new Map<
    string,
    { docs: number; subtotal: number; tax: number; total: number }
  >()

  for (const r of rows) {
    const cur = String(r.currency ?? 'JPY')
    const prev = yearAgg.get(cur) ?? { docs: 0, subtotal: 0, tax: 0, total: 0 }
    yearAgg.set(cur, {
      docs: prev.docs + Number(r.docs_count ?? 0),
      subtotal: prev.subtotal + Number(r.subtotal_amount ?? 0),
      tax: prev.tax + Number(r.tax_amount ?? 0),
      total: prev.total + Number(r.total_amount ?? 0),
    })
  }

  // =========================
  // 今月サマリー（通貨別）
  // =========================
  const nowYm = getNowYmJst()
  const thisMonthRows = rows.filter((r) => ymFromMonthValue(r.month) === nowYm)

  // =========================
  // 表示
  // =========================
  return (
    <div style={{ maxWidth: 980, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h1>月次集計</h1>
        <Link href="/dashboard">Dashboard</Link>
      </div>

<div
  style={{
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    margin: '12px 0 18px',
  }}
>
  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
    <span>Year:</span>
    <Link href={`/dashboard/monthly?year=${year - 1}`}>← {year - 1}</Link>
    <b>{year}</b>
    <Link href={`/dashboard/monthly?year=${year + 1}`}>{year + 1} →</Link>
  </div>

  {/* ✅ 年次CSV */}
  <a href={`/dashboard/monthly/export?year=${year}`} style={btnSmall}>
    CSVダウンロード（年）
  </a>
</div>


      {/* ✅ 年間合計（通貨別） */}
      <div style={{ marginBottom: 12, padding: 12, border: '1px solid #eee', borderRadius: 8 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>年間合計（通貨別）</div>

        {[...yearAgg.entries()].map(([cur, t]) => (
          <div key={cur} style={{ marginBottom: 8 }}>
            <div style={{ fontWeight: 700 }}>{cur}</div>
            <div style={{ color: '#333' }}>
              件数: {fmt(t.docs)} / 小計: {fmt(t.subtotal)} / 税: {fmt(t.tax)} / 合計:{' '}
              <b>{fmt(t.total)}</b>
            </div>
          </div>
        ))}

        {yearAgg.size === 0 && <div style={{ color: '#666' }}>対象データがありません</div>}
      </div>

      {/* ✅ 今月サマリー（あれば） */}
      <div style={{ marginBottom: 18, padding: 12, border: '1px solid #eee', borderRadius: 8 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>今月（{nowYm}）</div>
        {thisMonthRows.length > 0 ? (
          thisMonthRows.map((r, idx) => (
            <div key={`${r.currency}-${idx}`} style={{ marginBottom: 6 }}>
              {r.currency}：件数 {fmt(r.docs_count)} / 合計 <b>{fmt(r.total_amount)}</b>
              <span style={{ marginLeft: 10, color: '#666' }}>
                （小計 {fmt(r.subtotal_amount)} / 税 {fmt(r.tax_amount)}）
              </span>
            </div>
          ))
        ) : (
          <div style={{ color: '#666' }}>今月の発行データはありません</div>
        )}
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={th}>月</th>
            <th style={th}>通貨</th>
            <th style={{ ...th, textAlign: 'right' }}>件数</th>
            <th style={{ ...th, textAlign: 'right' }}>小計</th>
            <th style={{ ...th, textAlign: 'right' }}>税</th>
            <th style={{ ...th, textAlign: 'right' }}>合計</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => {
            const ym = ymFromMonthValue(r.month)
            return (
              <tr key={`${r.month}-${r.currency}-${idx}`}>
                {/* ✅ 月クリックで明細へ */}
                <td style={td}>
                  <Link href={`/dashboard/monthly/${ym}`} style={{ textDecoration: 'underline' }}>
                    {ym}
                  </Link>
                </td>
                <td style={td}>{r.currency}</td>
                <td style={{ ...td, textAlign: 'right' }}>{fmt(r.docs_count)}</td>
                <td style={{ ...td, textAlign: 'right' }}>{fmt(r.subtotal_amount)}</td>
                <td style={{ ...td, textAlign: 'right' }}>{fmt(r.tax_amount)}</td>
                <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{fmt(r.total_amount)}</td>
              </tr>
            )
          })}

          {rows.length === 0 && (
            <tr>
              <td style={td} colSpan={6}>
                No data.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div style={{ marginTop: 10, color: '#666', fontSize: 12 }}>
        ※ 「月」をクリックすると、その月の issued ドキュメント一覧が開きます。
      </div>
    </div>
  )
}

const th = { textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 } as const
const td = { borderBottom: '1px solid #eee', padding: 8, verticalAlign: 'top' } as const
const btnSmall = {
  padding: '6px 10px',
  border: '1px solid #ccc',
  borderRadius: 6,
  background: '#fff',
  textDecoration: 'none',
  color: 'inherit',
} as const
