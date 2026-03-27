'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default function CustomerNewPage() {
  const router = useRouter()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [address1, setAddress1] = useState('')
  const [address2, setAddress2] = useState('')
  const [note, setNote] = useState('')

  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const saveCustomer = async () => {
    setErr(null)

    const trimmed = name.trim()
    if (!trimmed) {
      setErr('顧客名を入力してください。')
      return
    }

    setBusy(true)
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
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

      const createdId = String(json?.customer?.id ?? '')
      if (createdId) {
        router.push(`/customers/${createdId}/edit`)
        router.refresh()
        return
      }

      router.push('/customers')
      router.refresh()
    } catch (e: any) {
      setErr(e?.message ?? String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ maxWidth: 760, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h1 style={{ margin: 0 }}>顧客を新規作成</h1>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link href="/customers">顧客一覧へ戻る</Link>
        </div>
      </div>

      <p style={{ color: '#666', marginTop: 12 }}>
        顧客マスタに新しい顧客を登録します。ここで登録した顧客は、書類編集画面の「顧客マスタから選択」に表示されます。
      </p>

      <div style={card}>
        <div style={{ display: 'grid', gap: 12 }}>
          <label>
            顧客名
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={input}
              disabled={busy}
              placeholder="株式会社テスト"
            />
          </label>

          <label>
            メールアドレス
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={input}
              disabled={busy}
              placeholder="example@example.com"
            />
          </label>

          <label>
            電話番号
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={input}
              disabled={busy}
              placeholder="06-1234-5678"
            />
          </label>

          <label>
            郵便番号
            <input
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              style={input}
              disabled={busy}
              placeholder="123-4567"
            />
          </label>

          <label>
            住所1
            <input
              value={address1}
              onChange={(e) => setAddress1(e.target.value)}
              style={input}
              disabled={busy}
              placeholder="大阪府大阪市..."
            />
          </label>

          <label>
            住所2
            <input
              value={address2}
              onChange={(e) => setAddress2(e.target.value)}
              style={input}
              disabled={busy}
              placeholder="建物名・部署名など"
            />
          </label>

          <label>
            メモ
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={{ ...input, minHeight: 80 }}
              disabled={busy}
            />
          </label>

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={saveCustomer} disabled={busy} style={btnPrimary}>
              {busy ? '保存中…' : '顧客を作成'}
            </button>

            <Link href="/customers" style={btnLink}>
              キャンセル
            </Link>
          </div>

          {err && <p style={{ color: 'crimson', margin: 0, whiteSpace: 'pre-wrap' }}>{err}</p>}
        </div>
      </div>
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