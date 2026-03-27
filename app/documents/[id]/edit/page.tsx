import Link from 'next/link'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { loadOrgBranding } from '@/lib/pdf/branding'
import BackToDocumentLink from './BackToDocumentLink'
import EditStatusBar from './EditStatusBar'
import EditPageClient from './EditPageClient'

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
    throw new Error('Missing env: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll().map((c: any) => ({ name: c.name, value: c.value }))
      },
      setAll() {
        /* Server Componentでは noop */
      },
    },
  })
}

export default async function DocumentEditPage({ params }: Props) {
  const p = 'then' in params ? await params : params
  const documentId = String((p as any).id ?? '')

  if (!UUID_RE.test(documentId)) {
    return <div style={{ padding: 40 }}>不正なドキュメントIDです: {documentId}</div>
  }

  const supabase = await createSupabase()

  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) {
    return (
      <div style={{ maxWidth: 860, margin: '40px auto', fontFamily: 'sans-serif' }}>
        <h1>書類編集</h1>
        <p>
          ログインが必要です。<Link href="/login">ログインへ</Link>
        </p>
      </div>
    )
  }

  const { data: doc, error: docErr } = await supabase
    .from('documents')
    .select(
      'id, org_id, doc_type, status, currency, document_no, issued_at, customer_id, customer_name, customer_honorific, title, notes, due_date'
    )
    .eq('id', documentId)
    .maybeSingle()

  if (docErr) return <div style={{ padding: 40 }}>エラー: {docErr.message}</div>
  if (!doc) return <div style={{ padding: 40 }}>対象が見つかりません。</div>

  const orgId = String((doc as any).org_id ?? '')
  if (!UUID_RE.test(orgId)) {
    return <div style={{ padding: 40 }}>エラー: Document org_id not found</div>
  }

  if ((doc as any).status !== 'draft') {
    return (
      <div style={{ maxWidth: 860, margin: '40px auto', fontFamily: 'sans-serif' }}>
        <h1>書類編集</h1>
        <p style={{ color: 'crimson' }}>
          このドキュメントは {(doc as any).status} のため編集できません。
        </p>
        <Link href={`/documents/${documentId}`}>戻る</Link>
      </div>
    )
  }

  const { data: customers, error: custErr } = await supabase
    .from('customers')
    .select('id, name')
    .eq('org_id', orgId)
    .order('name', { ascending: true })
    .limit(300)

  if (custErr) {
    return <div style={{ padding: 40 }}>顧客一覧の読込エラー: {custErr.message}</div>
  }

  let customerDetail:
    | {
        name?: string | null
        postal_code?: string | null
        address1?: string | null
        address2?: string | null
        email?: string | null
        phone?: string | null
      }
    | null = null

  if ((doc as any).customer_id) {
    const { data } = await supabase
      .from('customers')
      .select('name, postal_code, address1, address2, email, phone')
      .eq('id', (doc as any).customer_id)
      .eq('org_id', orgId)
      .maybeSingle()

    customerDetail = (data as any) ?? null
  }

  const { data: items, error: itemsErr } = await supabase
    .from('document_items')
    .select('id, position, description, quantity, unit_price_amount')
    .eq('document_id', documentId)
    .eq('org_id', orgId)
    .order('position', { ascending: true })

  if (itemsErr) return <div style={{ padding: 40 }}>エラー: {itemsErr.message}</div>

  const branding = await loadOrgBranding(supabase as any, orgId)
  const currency = String((doc as any).currency ?? 'JPY')

    const initialMeta = {
    customer_id: (doc as any).customer_id ?? null,
    customer_name: (doc as any).customer_name ?? '',
    customer_honorific: (doc as any).customer_honorific ?? null,
    title: (doc as any).title ?? '',
    notes: (doc as any).notes ?? '',
    due_date: (doc as any).due_date ?? null,
  }

  const initialItemsForEdit = ((items ?? []) as Array<{
    id?: string
    position: number
    description: string | null
    quantity: number
    unit_price_amount: number
  }>).map((it, idx) => ({
    id: it.id,
    position: it.position ?? idx + 1,
    description: it.description ?? '',
    quantity: Number(it.quantity ?? 0),
    unit_price_amount: Number(it.unit_price_amount ?? 0),
  }))

  return (
    <div
      style={{
        maxWidth: 1180,
        margin: '40px auto',
        fontFamily: 'sans-serif',
        padding: '0 16px',
      }}
    >
      <EditStatusBar
        documentId={documentId}
        documentNo={String((doc as any).document_no ?? (doc as any).id)}
        currency={currency}
      />

      <div style={{ minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            marginBottom: 16,
          }}
        >
          <h1 style={{ margin: 0 }}>書類編集</h1>
          <div style={{ display: 'none' }}>
            <BackToDocumentLink documentId={documentId} />
          </div>
        </div>

        <div
          style={{
            marginBottom: 16,
            padding: '10px 12px',
            border: '1px solid #e5e7eb',
            borderRadius: 10,
            background: '#f9fafb',
            fontSize: 12,
            lineHeight: 1.6,
            color: '#4b5563',
          }}
        >
          プレビューは編集中の内容、PDF保存は保存済み内容が反映されます。
        </div>

        <EditPageClient
          documentId={documentId}
          documentNo={String((doc as any).document_no ?? (doc as any).id)}
          docType={String((doc as any).doc_type ?? '')}
          issuedAt={String((doc as any).issued_at ?? '')}
          currency={currency}
          customers={(customers ?? []) as Array<{ id: string; name: string }>}
          initialMeta={initialMeta}
          initialItems={initialItemsForEdit}
          initialBranding={branding}
          initialCustomerDetail={customerDetail}
        />
      </div>
    </div>
  )
}