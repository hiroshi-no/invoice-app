'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type Customer = { id: string; name: string }

type PatchBody = {
  customer_id?: string | null
  title?: string | null
  notes?: string | null
  due_date?: string | null
}

export function DocumentMetaForm({
  documentId,
  initial,
  customers,
}: {
  documentId: string
  initial: PatchBody
  customers: Customer[]
}) {
  const router = useRouter()

  const [customerId, setCustomerId] = useState(initial.customer_id ?? '')
  const [title, setTitle] = useState(initial.title ?? '')
  const [notes, setNotes] = useState(initial.notes ?? '')
  const [dueDate, setDueDate] = useState(initial.due_date ?? '')

  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const customerOptions = useMemo(() => customers ?? [], [customers])

  const saveMeta = async () => {
    setErr(null)
    setOk(null)
    setBusy(true)

    try {
      const payload: PatchBody = {
        customer_id: customerId ? customerId : null,
        title: title ?? null,
        notes: notes ?? null,
        due_date: dueDate ? dueDate : null,
      }

      const res = await fetch(`/api/documents/${documentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErr(`HTTP ${res.status}: ${json.error ?? 'error'}`)
        return
      }

      setOk('保存しました')
      router.refresh()
    } catch (e: any) {
      setErr(e?.message ?? String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 12, marginBottom: 16 }}>
      <h2 style={{ marginTop: 0, fontSize: 16 }}>Document info</h2>

      <div style={{ display: 'grid', gap: 10 }}>
        <label>
          Customer（請求先）
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            style={input}
            disabled={busy}
          >
            <option value="">（未選択）</option>
            {customerOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
            顧客が0件なら customers のRLS/絞り込み条件を確認してください
          </div>
        </label>

        <label>
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} style={input} disabled={busy} />
        </label>

        <label>
          Notes
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{ ...input, minHeight: 80 }}
            disabled={busy}
          />
        </label>

        <label>
          Due date
          <input
            type="date"
            value={dueDate ?? ''}
            onChange={(e) => setDueDate(e.target.value)}
            style={input}
            disabled={busy}
          />
        </label>

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={saveMeta} disabled={busy} style={btn}>
            {busy ? '保存中…' : 'メタ情報を保存'}
          </button>
        </div>

        {err && <p style={{ color: 'crimson', margin: 0, whiteSpace: 'pre-wrap' }}>{err}</p>}
        {ok && <p style={{ color: 'green', margin: 0 }}>{ok}</p>}
      </div>
    </div>
  )
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

const btn = {
  padding: '8px 12px',
  border: '1px solid #ccc',
  borderRadius: 6,
  background: '#fff',
} as const
