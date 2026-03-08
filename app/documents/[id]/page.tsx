import Link from 'next/link'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import DocumentActions from './ui'
import { calcTotals } from '@/lib/calc'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> | { id: string } }

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

// cookies() が同期/非同期どっちでも安全に扱う
async function getCookieStore() {
  const c: any = cookies()
  return typeof c?.then === 'function' ? await c : c
}

async function createSupabase() {
  const cookieStore = await getCookieStore()

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local')
  }

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll().map((c: any) => ({ name: c.name, value: c.value }))
      },
      setAll() {
        // Server Component では cookie を set できないので noop
      },
    },
  })
}

function num(v: any) {
  if (v == null) return 0
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

export default async function DocumentDetailPage({ params }: Props) {
  const p = 'then' in params ? await params : params
  const documentId = String((p as any).id ?? '')

  if (!UUID_RE.test(documentId)) {
    notFound()
  }

  const supabase = await createSupabase()

  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) {
    return (
      <div style={{ maxWidth: 860, margin: '40px auto', fontFamily: 'sans-serif' }}>
        <h1>Document</h1>
        <p>
          Not logged in. <Link href="/login">Go to login</Link>
        </p>
      </div>
    )
  }

  // ✅ docは maybeSingle で安定 + org_id を確定
  const { data: doc, error: docErr } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .maybeSingle()

  if (docErr) throw new Error(docErr.message)
  if (!doc) notFound()

  const orgId = String((doc as any).org_id ?? '')
  if (!UUID_RE.test(orgId)) {
    throw new Error('Document org_id not found')
  }

  // ✅ items は org_id でも絞る（org整合）
  const { data: items, error: itemsErr } = await supabase
    .from('document_items')
    .select('*')
    .eq('document_id', documentId)
    .eq('org_id', orgId)
    .order('position', { ascending: true })

  if (itemsErr) throw new Error(itemsErr.message)

  // ✅ 金額は line_subtotal_amount を優先（DBトリガー計算に揃える）
  const rows = (items ?? []).map((it: any) => {
    const qty = num(it.quantity)
    const unit = num(it.unit_price_amount)
    const dbLineRaw = it.line_subtotal_amount
    const line = dbLineRaw == null ? qty * unit : num(dbLineRaw)
    return { ...it, qty, unit, line }
  })

  const subtotal = rows.reduce((a, r) => a + num(r.line), 0)
  const t = calcTotals(subtotal, (doc as any).currency ?? 'JPY')

  return (
    <div style={{ maxWidth: 980, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h1>Document</h1>

        <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
          <Link href="/documents">Back</Link>

          {(doc as any).status === 'draft' && <Link href={`/documents/${documentId}/edit`}>Edit</Link>}
        </div>
      </div>

      <h2 style={{ marginTop: 20 }}>Items</h2>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={th}>Description</th>
            <th style={{ ...th, textAlign: 'right' }}>Qty</th>
            <th style={{ ...th, textAlign: 'right' }}>Unit</th>
            <th style={{ ...th, textAlign: 'right' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r: any, idx: number) => (
            <tr key={r.id ?? idx}>
              <td style={td}>{r.description ?? '-'}</td>
              <td style={{ ...td, textAlign: 'right' }}>{r.qty}</td>
              <td style={{ ...td, textAlign: 'right' }}>{r.unit.toLocaleString()}</td>
              <td style={{ ...td, textAlign: 'right' }}>{num(r.line).toLocaleString()}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td style={td} colSpan={4}>
                No items
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
        <div style={{ width: 300, border: '1px solid #eee', borderRadius: 8, padding: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <b>Subtotal</b>
            <span>
              {t.subtotal.toLocaleString()} {(doc as any).currency ?? 'JPY'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <b>Tax (10%)</b>
            <span>
              {t.tax.toLocaleString()} {(doc as any).currency ?? 'JPY'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <b>Total</b>
            <span>
              {t.total.toLocaleString()} {(doc as any).currency ?? 'JPY'}
            </span>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <DocumentActions
          documentId={documentId}
          status={(doc as any).status}
          documentNo={(doc as any).document_no ?? null}
        />
      </div>
    </div>
  )
}

const th = { textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 } as const
const td = { borderBottom: '1px solid #eee', padding: 8, verticalAlign: 'top' } as const