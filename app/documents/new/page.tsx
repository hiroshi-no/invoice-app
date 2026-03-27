import Link from 'next/link'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getCurrentOrgIdForUser } from '@/lib/org/getCurrentOrgId'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Props = {
  searchParams?: Promise<{ type?: string }> | { type?: string }
}

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
        return cookieStore.getAll().map((c: any) => ({
          name: c.name,
          value: c.value,
        }))
      },
      setAll() {
        // Server Component では cookie を set できないので noop
      },
    },
  })
}

function normalizeDocType(v: any): 'invoice' | 'quote' | null {
  const s = String(v ?? '').toLowerCase()
  if (s === 'invoice') return 'invoice'
  if (s === 'quotation' || s === 'quote') return 'quote'
  return null
}

function labelForDocType(docType: 'invoice' | 'quote') {
  return docType === 'quote' ? '見積書' : '請求書'
}

function descriptionForDocType(docType: 'invoice' | 'quote') {
  if (docType === 'quote') {
    return '提出用の見積書を作成します。作成後は編集画面で請求先、明細、備考などを設定できます。'
  }
  return '請求書を作成します。作成後は編集画面で請求先、明細、支払期日、備考などを設定できます。'
}

export default async function NewDocumentPage({ searchParams }: Props) {
  const sp = searchParams ? ('then' in searchParams ? await searchParams : searchParams) : {}
  const docType = normalizeDocType((sp as any)?.type)

  const supabase = await createSupabase()

  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) {
    redirect('/login')
  }

  const userId = userData.user.id
  const orgId = await getCurrentOrgIdForUser(supabase as any, userId)

  if (!orgId) {
    throw new Error('current_org_id not found')
  }

  if (!docType) {
    return (
      <div
        style={{
          maxWidth: 980,
          margin: '40px auto',
          fontFamily: 'sans-serif',
          padding: '0 16px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            gap: 12,
            flexWrap: 'wrap',
            marginBottom: 12,
          }}
        >
          <h1 style={{ margin: 0 }}>新規書類作成</h1>
          <Link href="/documents">一覧へ戻る</Link>
        </div>

        <p
          style={{
            color: '#4b5563',
            lineHeight: 1.7,
            margin: '0 0 20px 0',
          }}
        >
          作成する書類の種類を選択してください。作成後は編集画面へ移動し、請求先・明細・備考・期日などを続けて設定できます。
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 16,
          }}
        >
          <Link href="/documents/new?type=invoice" style={cardLink}>
            <div style={cardTitleRow}>
              <div style={cardTitle}>請求書を作成</div>
              <div style={cardBadge}>invoice</div>
            </div>

            <div style={cardText}>
              取引先への請求に使う書類です。作成後は下書き状態で編集画面へ移動します。
            </div>

            <ul style={cardList}>
              <li>請求先・明細・支払期日を設定</li>
              <li>PDFプレビューと保存に対応</li>
              <li>保存済みPDF履歴を管理可能</li>
            </ul>

            <div style={cardAction}>新規請求書を作成</div>
          </Link>

          <Link href="/documents/new?type=quotation" style={cardLink}>
            <div style={cardTitleRow}>
              <div style={cardTitle}>見積書を作成</div>
              <div style={cardBadge}>quotation</div>
            </div>

            <div style={cardText}>
              提案や見積提示に使う書類です。作成後は下書き状態で編集画面へ移動します。
            </div>

            <ul style={cardList}>
              <li>請求先・明細・有効期限を設定</li>
              <li>PDFプレビューと保存に対応</li>
              <li>保存済みPDF履歴を管理可能</li>
            </ul>

            <div style={cardAction}>新規見積書を作成</div>
          </Link>
        </div>

        <div
          style={{
            marginTop: 20,
            padding: '12px 14px',
            border: '1px solid #e5e7eb',
            borderRadius: 12,
            background: '#f9fafb',
            color: '#6b7280',
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          作成時点では下書きとして保存されます。書類番号の確定やPDF保存は、作成後の画面で進められます。
        </div>
      </div>
    )
  }

  const today = new Date().toISOString().slice(0, 10)

    const insertPayload: Record<string, any> = {
    org_id: orgId,
    created_by: userId,
    doc_type: docType,
    status: 'draft',
    currency: 'JPY',
    issued_at: today,
    title: null,
  }

  const { data, error } = await supabase
    .from('documents')
    .insert(insertPayload)
    .select('id')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  redirect(`/documents/${data.id}/edit`)
}

const cardLink: React.CSSProperties = {
  display: 'block',
  border: '1px solid #e5e7eb',
  borderRadius: 16,
  padding: 18,
  background: '#fff',
  textDecoration: 'none',
  color: '#111827',
  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
}

const cardTitleRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 12,
  flexWrap: 'wrap',
  marginBottom: 12,
}

const cardTitle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
}

const cardBadge: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '4px 10px',
  borderRadius: 999,
  border: '1px solid #e5e7eb',
  background: '#f9fafb',
  color: '#6b7280',
  fontSize: 12,
  fontWeight: 700,
  whiteSpace: 'nowrap',
}

const cardText: React.CSSProperties = {
  fontSize: 14,
  color: '#4b5563',
  lineHeight: 1.7,
}

const cardList: React.CSSProperties = {
  margin: '14px 0 0 18px',
  padding: 0,
  color: '#374151',
  lineHeight: 1.8,
  fontSize: 14,
}

const cardAction: React.CSSProperties = {
  marginTop: 16,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '10px 14px',
  border: '1px solid #d1d5db',
  borderRadius: 10,
  background: '#fff',
  color: '#111827',
  fontSize: 13,
  fontWeight: 700,
}