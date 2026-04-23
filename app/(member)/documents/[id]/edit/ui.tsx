'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

type Item = {
  id?: string
  position: number
  description: string | null
  quantity: number
  unit_price_amount: number
}

const uuidRe =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const isUuid = (v: any) => typeof v === 'string' && uuidRe.test(v)

function num(v: any) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

export default function EditItemsForm({
  documentId,
  initialItems,
  onItemsChange,
}: {
  documentId: string
  initialItems: Item[]
  onItemsChange?: (items: Item[]) => void
}) {
  const router = useRouter()

  const DIRTY_KEY = useMemo(() => `invoice:doc:${documentId}:items_dirty`, [documentId])
  const HASH_KEY = useMemo(() => `invoice:doc:${documentId}:items_hash`, [documentId])

  const normalizeIncomingItems = (list: Item[]) =>
    (list ?? []).map((it, idx) => ({
      ...it,
      position: it.position ?? idx + 1,
      description: it.description ?? '',
      quantity: Number(it.quantity ?? 0),
      unit_price_amount: Number(it.unit_price_amount ?? 0),
    }))

  const normalizeForCompare = (list: Item[]) =>
    (list ?? []).map((it, idx) => ({
      id: it.id,
      position: idx + 1,
      description: String(it.description ?? ''),
      quantity: Number(it.quantity ?? 0),
      unit_price_amount: Number(it.unit_price_amount ?? 0),
    }))

  const initialNormalizedItems = useMemo(
    () => normalizeIncomingItems(initialItems ?? []),
    [initialItems]
  )

  const initialBaseState = useMemo(
    () => JSON.stringify(normalizeForCompare(initialNormalizedItems)),
    [initialNormalizedItems]
  )

  const [items, setItems] = useState<Item[]>(initialNormalizedItems)
  const [deleteIds, setDeleteIds] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const baseRef = useRef<string>(initialBaseState)
  const dirtyRef = useRef(false)
  const didMountRef = useRef(false)

  const normalizeForHash = (list: Item[]) =>
    (list ?? [])
      .map((it, idx) => {
        const id = String(it.id ?? '')

        const rawPos = Number((it as any).position)
        const position = Number.isFinite(rawPos) && rawPos > 0 ? rawPos : idx + 1

        const desc = String(it.description ?? '').trim()

        const qn = Number(it.quantity ?? 0)
        const qty = Number.isFinite(qn) ? (Math.round(qn * 100) / 100).toFixed(2) : '0.00'

        const unitRaw = String(it.unit_price_amount ?? '').trim()
        let unit = '0'
        if (/^-?\d+$/.test(unitRaw)) {
          try {
            unit = BigInt(unitRaw).toString()
          } catch {
            const un = Number(unitRaw)
            unit = Number.isFinite(un) ? String(Math.trunc(un)) : '0'
          }
        } else {
          const un = Number(unitRaw)
          unit = Number.isFinite(un) ? String(Math.trunc(un)) : '0'
        }

        return { id, position, desc, qty, unit }
      })
      .sort(
        (
          a: { id: string; position: number },
          b: { id: string; position: number }
        ) => (a.position - b.position) || a.id.localeCompare(b.id)
      )

  async function sha256Hex(text: string) {
    const enc = new TextEncoder()
    const buf = await crypto.subtle.digest('SHA-256', enc.encode(text))
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
  }

  async function computeItemsHash(list: Item[]) {
    const norm = normalizeForHash(list)
    return sha256Hex(JSON.stringify(norm))
  }

  useEffect(() => {
    if (typeof window === 'undefined') return

    ;(async () => {
      try {
        const h = await computeItemsHash(items)
        localStorage.setItem(HASH_KEY, h)
      } catch {}
    })()
  }, [HASH_KEY]) // 初回のみ相当

  const dirty = useMemo(() => {
    const now = JSON.stringify(normalizeForCompare(items))
    return baseRef.current !== '' && now !== baseRef.current
  }, [items])

  useEffect(() => {
    dirtyRef.current = dirty
  }, [dirty])

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true
      return
    }

    if (dirtyRef.current) return

    setItems(initialNormalizedItems)
    setDeleteIds([])
    setErr(null)
    setOk(null)
    baseRef.current = initialBaseState

    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(DIRTY_KEY)
      } catch {}

      ;(async () => {
        try {
          const h = await computeItemsHash(initialNormalizedItems)
          localStorage.setItem(HASH_KEY, h)
        } catch {}
      })()
    }
  }, [initialNormalizedItems, initialBaseState, DIRTY_KEY, HASH_KEY])

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (dirty) {
      localStorage.setItem(DIRTY_KEY, '1')
    } else {
      localStorage.removeItem(DIRTY_KEY)
    }
  }, [dirty, DIRTY_KEY])

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])

  const normalized = useMemo(() => {
    return items.map((it, idx) => ({ ...it, position: idx + 1 }))
  }, [items])

  useEffect(() => {
    onItemsChange?.(normalized)
  }, [normalized, onItemsChange])

  const addRow = () => {
    setOk(null)
    setErr(null)
    setItems((prev) => [
      ...prev,
      {
        position: prev.length + 1,
        description: '',
        quantity: 1,
        unit_price_amount: 0,
      },
    ])
  }

  const removeRow = (index: number) => {
    setOk(null)
    setErr(null)
    setItems((prev) => {
      const target = prev[index]
      if (target?.id && isUuid(target.id)) {
        setDeleteIds((d) => [...d, target.id!])
      }
      return prev.filter((_, i) => i !== index)
    })
  }

  const moveRow = (from: number, to: number) => {
    setOk(null)
    setErr(null)
    setItems((prev) => {
      if (to < 0 || to >= prev.length) return prev
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
  }

  const moveUp = (idx: number) => moveRow(idx, idx - 1)
  const moveDown = (idx: number) => moveRow(idx, idx + 1)

  const updateField = (idx: number, key: keyof Item, value: any) => {
    setOk(null)
    setErr(null)
    setItems((prev) => {
      const next = [...prev]
      const cur = { ...next[idx] }
      ;(cur as any)[key] = value
      next[idx] = cur
      return next
    })
  }

  const save = async (): Promise<boolean> => {
    setErr(null)
    setOk(null)
    setBusy(true)

    try {
      const payload = {
        items: items.map((it) => ({
          ...(isUuid(it.id) ? { id: it.id } : {}),
          description: it.description ?? '',
          quantity: Number(it.quantity ?? 0),
          unit_price_amount: Number(it.unit_price_amount ?? 0),
        })),
        deleteIds: (deleteIds ?? []).filter(isUuid),
      }

      const res = await fetch(`/api/documents/${documentId}/items`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErr(`HTTP ${res.status}: ${json.error ?? 'error'}`)
        return false
      }

      const newItems = (json.items ?? [])
        .map((it: any): Item => ({
          id: it.id,
          position: Number(it.position ?? 0),
          description: it.description ?? '',
          quantity: Number(it.quantity ?? 0),
          unit_price_amount: Number(it.unit_price_amount ?? 0),
        }))
        .sort(
          (
            a: { position?: number | null },
            b: { position?: number | null }
          ) => (a.position ?? 0) - (b.position ?? 0)
        )

      setItems(newItems)
      setDeleteIds([])
      setOk('明細を保存しました')

      baseRef.current = JSON.stringify(normalizeForCompare(newItems))

      try {
        localStorage.removeItem(DIRTY_KEY)
      } catch {}

      try {
        const h = await computeItemsHash(newItems)
        localStorage.setItem(HASH_KEY, h)
      } catch {}

      router.refresh()
      return true
    } catch (e: any) {
      setErr(e?.message ?? String(e))
      return false
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 10 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>明細編集</h2>
        <div style={{ fontSize: 12, color: '#666', marginTop: 4, lineHeight: 1.6 }}>
          品目・数量・単価を入力します。保存するとPDF保存や発行に反映されます。
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 12,
        }}
      >
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="button" onClick={addRow} disabled={busy} style={btnPrimary}>
            ＋ 行を追加
          </button>

          <button type="button" onClick={save} disabled={busy} style={btn}>
            {busy ? '保存中…' : '明細を保存'}
          </button>

          {dirty && !busy && (
            <span
              style={{
                color: '#b45309',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              未保存の変更があります
            </span>
          )}
        </div>

        <div
          style={{
            fontSize: 12,
            color: '#6b7280',
            background: '#f8fafc',
            border: '1px solid #e5e7eb',
            borderRadius: 999,
            padding: '4px 10px',
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          {normalized.length}件
        </div>
      </div>

      {err && <p style={{ color: 'crimson', marginTop: 0 }}>{err}</p>}
      {ok && <p style={{ color: 'green', marginTop: 0 }}>{ok}</p>}

      {normalized.length === 0 ? (
        <div
          style={{
            border: '1px dashed #cbd5e1',
            borderRadius: 12,
            background: '#f8fafc',
            padding: 18,
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: '#111827',
              marginBottom: 6,
            }}
          >
            明細がまだありません
          </div>

          <div
            style={{
              fontSize: 12,
              color: '#6b7280',
              lineHeight: 1.7,
              marginBottom: 12,
            }}
          >
            「＋ 行を追加」から最初の明細を作成してください。
            <br />
            例）デザイン制作 / 1 / 50,000
          </div>

          <button type="button" onClick={addRow} disabled={busy} style={btnPrimary}>
            ＋ 最初の行を追加
          </button>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}>
            <thead>
              <tr>
                <th style={th}>行</th>
                <th style={th}>内容</th>
                <th style={{ ...th, textAlign: 'right' }}>数量</th>
                <th style={{ ...th, textAlign: 'right' }}>単価</th>
                <th style={{ ...th, textAlign: 'right' }}>小計</th>
                <th style={th}>並び替え</th>
                <th style={th}>削除</th>
              </tr>
            </thead>

            <tbody>
              {normalized.map((it, idx) => {
                const lineTotal = num(it.quantity) * num(it.unit_price_amount)

                return (
                  <tr key={it.id ?? `new-${idx}`}>
                    <td style={td}>{it.position}</td>

                    <td style={td}>
                      <input
                        value={it.description ?? ''}
                        onChange={(e) => updateField(idx, 'description', e.target.value)}
                        style={input}
                        placeholder="内容を入力"
                      />
                    </td>

                    <td style={{ ...td, textAlign: 'right' }}>
                      <input
                        type="number"
                        value={it.quantity ?? 0}
                        onChange={(e) => updateField(idx, 'quantity', e.target.value)}
                        style={{ ...input, textAlign: 'right', width: 100 }}
                        placeholder="0"
                      />
                    </td>

                    <td style={{ ...td, textAlign: 'right' }}>
                      <input
                        type="number"
                        value={it.unit_price_amount ?? 0}
                        onChange={(e) => updateField(idx, 'unit_price_amount', e.target.value)}
                        style={{ ...input, textAlign: 'right', width: 140 }}
                        placeholder="0"
                      />
                    </td>

                    <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 700 }}>
                      {lineTotal.toLocaleString()}
                    </td>

                    <td style={td}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button type="button" onClick={() => moveUp(idx)} disabled={busy || idx === 0} style={btnSmall}>
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moveDown(idx)}
                          disabled={busy || idx === normalized.length - 1}
                          style={btnSmall}
                        >
                          ↓
                        </button>
                      </div>
                    </td>

                    <td style={td}>
                      <button type="button" onClick={() => removeRow(idx)} disabled={busy} style={btnSmallDanger}>
                        削除
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const btn: React.CSSProperties = {
  padding: '8px 12px',
  border: '1px solid #ccc',
  borderRadius: 8,
  background: '#fff',
  fontSize: 14,
}

const btnPrimary: React.CSSProperties = {
  padding: '8px 12px',
  border: '1px solid #111827',
  borderRadius: 8,
  background: '#111827',
  color: '#fff',
  fontSize: 14,
  fontWeight: 700,
}

const btnSmall: React.CSSProperties = {
  padding: '6px 10px',
  border: '1px solid #ccc',
  borderRadius: 6,
  background: '#fff',
  fontSize: 13,
}

const btnSmallDanger: React.CSSProperties = {
  padding: '6px 10px',
  border: '1px solid #fecaca',
  borderRadius: 6,
  background: '#fff5f5',
  color: '#b91c1c',
  fontSize: 13,
}

const th: React.CSSProperties = {
  textAlign: 'left',
  borderBottom: '1px solid #ddd',
  padding: 8,
  fontSize: 13,
  color: '#374151',
  background: '#fafafa',
}

const td: React.CSSProperties = {
  borderBottom: '1px solid #eee',
  padding: 8,
  verticalAlign: 'top',
}

const input: React.CSSProperties = {
  width: '100%',
  padding: 8,
  border: '1px solid #ccc',
  borderRadius: 6,
  boxSizing: 'border-box',
  background: '#fff',
}