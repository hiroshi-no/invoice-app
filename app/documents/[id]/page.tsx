import Link from 'next/link'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import DocumentActions from './ui'
import { calcTotals } from '@/lib/calc'
import DocumentPdfSummaryCard from './DocumentPdfSummaryCard'
import PlanStatusBanner from '@/app/components/PlanStatusBanner'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> | { id: string } }

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

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

function textOrDash(v: any) {
  const s = String(v ?? '').trim()
  return s ? s : '-'
}

function labelDocType(v: any) {
  const s = String(v ?? '').toLowerCase()
  if (s === 'invoice') return '請求書'
  if (s === 'quotation') return '見積書'
  if (s === 'quote') return '見積書'
  return String(v ?? '-')
}

function labelStatus(v: any) {
  const s = String(v ?? '').toLowerCase()
  if (s === 'draft') return '下書き'
  if (s === 'issued') return '発行済み'
  if (s === 'paid') return '支払済み'
  if (s === 'cancelled') return '取消'
  return String(v ?? '-')
}

function buildCustomerAddress(customer: any) {
  if (!customer) return ''
  return [customer.postal_code, customer.address1, customer.address2]
    .map((v) => String(v ?? '').trim())
    .filter(Boolean)
    .join(' ')
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
        <h1>書類詳細</h1>
        <p>
          ログインが必要です。<Link href="/login">ログインへ</Link>
        </p>
      </div>
    )
  }

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

  const customerId = String((doc as any).customer_id ?? '')
  let customer: any = null

  if (UUID_RE.test(customerId)) {
    const { data: customerData, error: customerErr } = await supabase
      .from('customers')
      .select('id, name, email, phone, postal_code, address1, address2, note')
      .eq('id', customerId)
      .maybeSingle()

    if (customerErr) {
      throw new Error(customerErr.message)
    }

    customer = customerData ?? null
  }

  const { data: items, error: itemsErr } = await supabase
    .from('document_items')
    .select('*')
    .eq('document_id', documentId)
    .eq('org_id', orgId)
    .order('position', { ascending: true })

  if (itemsErr) throw new Error(itemsErr.message)

  const rows = (items ?? []).map((it: any) => {
    const qty = num(it.quantity)
    const unit = num(it.unit_price_amount)
    const dbLineRaw = it.line_subtotal_amount
    const line = dbLineRaw == null ? qty * unit : num(dbLineRaw)
    return { ...it, qty, unit, line }
  })

  const subtotal = rows.reduce((a, r) => a + num(r.line), 0)
  const t = calcTotals(subtotal, (doc as any).currency ?? 'JPY')

  const docTypeLabel = labelDocType((doc as any).doc_type)
  const statusLabel = labelStatus((doc as any).status)

  const documentCustomerName = String((doc as any).customer_name ?? '').trim()
  const masterCustomerName = String(customer?.name ?? '').trim()
  const displayCustomerName = documentCustomerName || masterCustomerName || '-'

  const customerEmail = String(customer?.email ?? '').trim()
  const customerPhone = String(customer?.phone ?? '').trim()
  const customerAddress = buildCustomerAddress(customer)
  const customerNote = String(customer?.note ?? '').trim()

  return (
    <div style={{ maxWidth: 980, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h1>書類詳細</h1>

        <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
          <Link href="/documents">一覧へ戻る</Link>

          {(doc as any).status === 'draft' && <Link href={`/documents/${documentId}/edit`}>編集</Link>}
        </div>
      </div>

      <p style={{ color: '#666', marginTop: 12 }}>
        発行可能数は現在のプランに応じて変わります。確定前に今月の残数を確認できます。
      </p>

      <PlanStatusBanner kind="document" />

      <div
        style={{
          marginTop: 16,
          border: '1px solid #eee',
          borderRadius: 8,
          padding: 16,
          background: '#fff',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', rowGap: 10, columnGap: 12 }}>
          <div style={metaLabel}>種別</div>
          <div>{docTypeLabel}</div>

          <div style={metaLabel}>書類番号</div>
          <div>{textOrDash((doc as any).document_no)}</div>

          <div style={metaLabel}>状態</div>
          <div>{statusLabel}</div>

          <div style={metaLabel}>発行日</div>
          <div>{textOrDash((doc as any).issued_at)}</div>

          <div style={metaLabel}>通貨</div>
          <div>{textOrDash((doc as any).currency ?? 'JPY')}</div>

          <div style={metaLabel}>請求先名</div>
          <div>{displayCustomerName}</div>

          {(doc as any).title ? (
            <>
              <div style={metaLabel}>帳票タイトル</div>
              <div>{(doc as any).title}</div>
            </>
          ) : null}

          {(doc as any).notes ? (
            <>
              <div style={metaLabel}>備考</div>
              <div style={{ whiteSpace: 'pre-wrap' }}>{(doc as any).notes}</div>
            </>
          ) : null}

          {(doc as any).due_date ? (
            <>
              <div style={metaLabel}>支払期日</div>
              <div>{(doc as any).due_date}</div>
            </>
          ) : null}
        </div>
      </div>

      {customer && (
        <div
          style={{
            marginTop: 16,
            border: '1px solid #eee',
            borderRadius: 8,
            padding: 16,
            background: '#fafafa',
          }}
        >
          <h2 style={{ margin: '0 0 12px 0', fontSize: 18 }}>顧客情報</h2>

          <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', rowGap: 10, columnGap: 12 }}>
            <div style={metaLabel}>顧客マスタ名</div>
            <div>{textOrDash(masterCustomerName)}</div>

            <div style={metaLabel}>メールアドレス</div>
            <div>{textOrDash(customerEmail)}</div>

            <div style={metaLabel}>電話番号</div>
            <div>{textOrDash(customerPhone)}</div>

            <div style={metaLabel}>住所</div>
            <div>{textOrDash(customerAddress)}</div>

            {customerNote ? (
              <>
                <div style={metaLabel}>顧客メモ</div>
                <div style={{ whiteSpace: 'pre-wrap' }}>{customerNote}</div>
              </>
            ) : null}
          </div>

          {documentCustomerName && documentCustomerName !== masterCustomerName ? (
            <p style={{ marginTop: 12, color: '#666', fontSize: 13 }}>
              ※ この書類では、顧客マスタ名ではなく「請求先名」の上書き値を表示しています。
            </p>
          ) : null}
        </div>
      )}

      <h2 style={{ marginTop: 24 }}>明細</h2>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={th}>内容</th>
            <th style={{ ...th, textAlign: 'right' }}>数量</th>
            <th style={{ ...th, textAlign: 'right' }}>単価</th>
            <th style={{ ...th, textAlign: 'right' }}>金額</th>
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
                明細はまだありません。
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
        <div style={{ width: 320, border: '1px solid #eee', borderRadius: 8, padding: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <b>小計</b>
            <span>
              {t.subtotal.toLocaleString()} {(doc as any).currency ?? 'JPY'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <b>消費税（10%）</b>
            <span>
              {t.tax.toLocaleString()} {(doc as any).currency ?? 'JPY'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <b>合計</b>
            <span>
              {t.total.toLocaleString()} {(doc as any).currency ?? 'JPY'}
            </span>
          </div>
        </div>
      </div>

      <DocumentPdfSummaryCard documentId={documentId} />

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

const metaLabel = {
  color: '#555',
  fontWeight: 700,
} as const

const th = { textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 } as const
const td = { borderBottom: '1px solid #eee', padding: 8, verticalAlign: 'top' } as const