'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type Customer = {
  id: string
  org_id?: string
  name: string
  email?: string | null
  phone?: string | null
  postal_code?: string | null
  address1?: string | null
  address2?: string | null
  note?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export default function CustomerEditPage() {
  const router = useRouter()
  const params = useParams()

  const customerId = useMemo(() => {
    const raw = (params as any)?.id
    return Array.isArray(raw) ? String(raw[0] ?? '') : String(raw ?? '')
  }, [params])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [customer, setCustomer] = useState<Customer | null>(null)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [address1, setAddress1] = useState('')
  const [address2, setAddress2] = useState('')
  const [note, setNote] = useState('')

  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  useEffect(() => {
    let alive = true

    const load = async () => {
      setErr(null)
      setOk(null)

      if (!UUID_RE.test(customerId)) {
        setErr(`不正な顧客IDです: ${customerId}`)
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const res = await fetch(`/api/customers/${customerId}`, {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        })

        const json = await res.json().catch(() => ({}))
        if (!res.ok) {
          if (!alive) return
          setErr(`HTTP ${res.status}: ${json.message ?? json.error ?? 'error'}`)
          setLoading(false)
          return
        }

        const nextCustomer = (json?.customer ?? null) as Customer | null
        if (!alive) return

        setCustomer(nextCustomer)
        setName(String(nextCustomer?.name ?? ''))
        setEmail(String(nextCustomer?.email ?? ''))
        setPhone(String(nextCustomer?.phone ?? ''))
        setPostalCode(String(nextCustomer?.postal_code ?? ''))
        setAddress1(String(nextCustomer?.address1 ?? ''))
        setAddress2(String(nextCustomer?.address2 ?? ''))
        setNote(String(nextCustomer?.note ?? ''))
      } catch (e: any) {
        if (!alive) return
        setErr(e?.message ?? String(e))
      } finally {
        if (alive) setLoading(false)
      }
    }

    void load()

    return () => {
      alive = false
    }
  }, [customerId])

  const saveCustomer = async () => {
    setErr(null)
    setOk(null)

    const trimmed = name.trim()
    if (!trimmed) {
      setErr('顧客名を入力してください。')
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/customers/${customerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: trimmed,
          email,
          phone,
          postal_code: postalCode,
          address1,
          address2,
          note,
        }),
      })

      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErr(`HTTP ${res.status}: ${json.message ?? json.error ?? 'error'}`)
        return
      }

      const updated = (json?.customer ?? null) as Customer | null
      if (updated) {
        setCustomer(updated)
        setName(String(updated.name ?? ''))
        setEmail(String(updated.email ?? ''))
        setPhone(String(updated.phone ?? ''))
        setPostalCode(String(updated.postal_code ?? ''))
        setAddress1(String(updated.address1 ?? ''))
        setAddress2(String(updated.address2 ?? ''))
        setNote(String(updated.note ?? ''))
      }

      setOk('保存しました')
      router.refresh()
    } catch (e: any) {
      setErr(e?.message ?? String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: 760, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h1 style={{ margin: 0 }}>顧客を編集</h1>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link href="/customers">顧客一覧へ戻る</Link>
        </div>
      </div>

      <p style={{ color: '#666', marginTop: 12 }}>
        顧客マスタに登録されている情報を更新します。ここで編集した内容は、書類編集画面の「顧客マスタから選択」に表示される元データになります。
      </p>

      {loading ? (
        <div style={card}>
          <p style={{ margin: 0 }}>読み込み中…</p>
        </div>
      ) : err && !customer ? (
        <div style={card}>
          <p style={{ color: 'crimson', margin: 0, whiteSpace: 'pre-wrap' }}>{err}</p>
        </div>
      ) : (
        <div style={card}>
          <div style={{ display: 'grid', gap: 12 }}>
            <label>
              顧客名
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={input}
                disabled={saving}
                placeholder="株式会社テスト"
              />
            </label>

            <label>
              メールアドレス
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={input}
                disabled={saving}
                placeholder="example@example.com"
              />
            </label>

            <label>
              電話番号
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={input}
                disabled={saving}
                placeholder="06-1234-5678"
              />
            </label>

            <label>
              郵便番号
              <input
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                style={input}
                disabled={saving}
                placeholder="123-4567"
              />
            </label>

            <label>
              住所1
              <input
                value={address1}
                onChange={(e) => setAddress1(e.target.value)}
                style={input}
                disabled={saving}
                placeholder="大阪府大阪市..."
              />
            </label>

            <label>
              住所2
              <input
                value={address2}
                onChange={(e) => setAddress2(e.target.value)}
                style={input}
                disabled={saving}
                placeholder="建物名・部署名など"
              />
            </label>

            <label>
              メモ
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                style={{ ...input, minHeight: 80 }}
                disabled={saving}
              />
            </label>

            <div style={{ fontSize: 12, color: '#666' }}>
              <div>顧客ID: {customer?.id ?? customerId}</div>
              {customer?.created_at ? <div>作成日時: {customer.created_at}</div> : null}
              {customer?.updated_at ? <div>更新日時: {customer.updated_at}</div> : null}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={saveCustomer} disabled={saving} style={btnPrimary}>
                {saving ? '保存中…' : '保存'}
              </button>

              <Link href="/customers" style={btnLink}>
                キャンセル
              </Link>
            </div>

            {err && <p style={{ color: 'crimson', margin: 0, whiteSpace: 'pre-wrap' }}>{err}</p>}
            {ok && <p style={{ color: 'green', margin: 0 }}>{ok}</p>}
          </div>
        </div>
      )}
    </div>
  )
}

const card = {
  marginTop: 16,
  padding: 16,
  border: '1px solid #eee',
  borderRadius: 8,
  background: '#fff',
}

const input = {
  width: '100%',
  padding: 8,
  border: '1px solid #ccc',
  borderRadius: 6,
  display: 'block',
  marginTop: 4,
  background: '#fff',
} as const

const btnPrimary = {
  padding: '8px 12px',
  border: '1px solid #2563eb',
  borderRadius: 6,
  background: '#2563eb',
  color: '#fff',
  cursor: 'pointer',
} as const

const btnLink = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '8px 12px',
  border: '1px solid #ccc',
  borderRadius: 6,
  background: '#fff',
  color: '#111',
  textDecoration: 'none',
} as const