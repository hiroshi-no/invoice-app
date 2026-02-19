import Link from 'next/link'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import EditItemsForm from './ui'
import { DocumentMetaForm } from './DocumentMetaForm'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> | { id: string } }

// cookies() が同期/非同期どっちでも安全に扱う
async function getCookieStore() {
  const c: any = cookies()
  return typeof c?.then === 'function' ? await c : c
}

async function createSupabase() {
  const cookieStore = await getCookieStore()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Missing env: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY')

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
  const documentId = p.id

  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRe.test(documentId)) {
    return <div style={{ padding: 40 }}>Invalid document id: {documentId}</div>
  }

  const supabase = await createSupabase()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return (
      <div style={{ maxWidth: 860, margin: '40px auto', fontFamily: 'sans-serif' }}>
        <h1>Edit</h1>
        <p>
          Not logged in. <Link href="/login">Go to login</Link>
        </p>
      </div>
    )
  }

  const { data: docs, error: docErr } = await supabase
    .from('documents')
    .select('id, status, currency, document_no, customer_id, title, notes, due_date')
    .eq('id', documentId)
    .limit(1)

  if (docErr) return <div style={{ padding: 40 }}>Error: {docErr.message}</div>
  const doc = docs?.[0]
  if (!doc) return <div style={{ padding: 40 }}>Not found</div>

  if (doc.status !== 'draft') {
    return (
      <div style={{ maxWidth: 860, margin: '40px auto', fontFamily: 'sans-serif' }}>
        <h1>Edit</h1>
        <p style={{ color: 'crimson' }}>このドキュメントは {doc.status} のため編集できません。</p>
        <Link href={`/documents/${documentId}`}>Back</Link>
      </div>
    )
  }

  const { data: customers, error: custErr } = await supabase
    .from('customers')
    .select('id, name')
    .order('name', { ascending: true })
    .limit(300)

  if (custErr) return <div style={{ padding: 40 }}>Customers load error: {custErr.message}</div>

  const { data: items, error: itemsErr } = await supabase
    .from('document_items')
    .select('id, position, description, quantity, unit_price_amount')
    .eq('document_id', documentId)
    .order('position', { ascending: true })

  if (itemsErr) return <div style={{ padding: 40 }}>Error: {itemsErr.message}</div>

  return (
    <div style={{ maxWidth: 980, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h1>Edit Items</h1>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link href={`/documents/${documentId}`}>Back</Link>
        </div>
      </div>

      <p style={{ color: '#666' }}>
        Doc: {doc.document_no ?? doc.id} / Currency: {doc.currency ?? 'JPY'}
      </p>

      {/* ✅ documents（メタ情報）更新フォーム：customers を渡す */}
      <DocumentMetaForm
        documentId={documentId}
        customers={(customers ?? []) as Array<{ id: string; name: string }>}
        initial={{
          customer_id: doc.customer_id ?? null,
          title: doc.title ?? '',
          notes: doc.notes ?? '',
          due_date: doc.due_date ?? null,
        }}
      />

      <EditItemsForm documentId={documentId} initialItems={items ?? []} />
    </div>
  )
}
