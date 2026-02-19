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

export default function EditItemsForm({
  documentId,
  initialItems,
}: {
  documentId: string
  initialItems: Item[]
}) {
  const router = useRouter()

  // ✅ documents/<id> 側で “未保存” を検知するためのキー
  const DIRTY_KEY = useMemo(() => `invoice:doc:${documentId}:items_dirty`, [documentId])

 // ✅ “最後に保存されたitems” のハッシュ（DocumentActions が送る）
  const HASH_KEY = useMemo(() => `invoice:doc:${documentId}:items_hash`, [documentId])
 

  const [items, setItems] = useState<Item[]>(
    (initialItems ?? []).map((it, idx) => ({
      ...it,
      position: it.position ?? idx + 1,
      description: it.description ?? '',
      quantity: Number(it.quantity ?? 0),
      unit_price_amount: Number(it.unit_price_amount ?? 0),
    }))
  )
  const [deleteIds, setDeleteIds] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  // 比較用に「必要なフィールドだけ」にして順番も含めて比較する
  const normalizeForCompare = (list: Item[]) =>
   (list ?? []).map((it, idx) => ({
     id: it.id,
     position: idx + 1, // ✅ 常に並び順で決める（ここ重要）
     description: String(it.description ?? ''),
     quantity: Number(it.quantity ?? 0),
     unit_price_amount: Number(it.unit_price_amount ?? 0),
   }))


  // 初期スナップショット（未保存判定の基準）
  const baseRef = useRef<string>('')

// ✅ server と同じ key / 正規化に合わせる
const normalizeForHash = (list: Item[]) =>
  (list ?? [])
    .map((it, idx) => {
      const id = String(it.id ?? '')

      // ✅ 修正：position は「1以上」だけ有効。0/NaN/null は idx+1 にフォールバック
      const rawPos = Number((it as any).position)
      const position = Number.isFinite(rawPos) && rawPos > 0 ? rawPos : (idx + 1)

      const desc = String(it.description ?? '').trim()

      const qn = Number(it.quantity ?? 0)
      const qty = Number.isFinite(qn) ? (Math.round(qn * 100) / 100).toFixed(2) : '0.00'

      // ✅ server の normalizeIntStr と同等（BigInt優先）
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

      // ✅ server と同じキー順（id, position, desc, qty, unit）
      return { id, position, desc, qty, unit }
    })
    .sort((a, b) => (a.position - b.position) || a.id.localeCompare(b.id))

async function sha256Hex(text: string) {
  const enc = new TextEncoder()
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(text))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function computeItemsHash(list: Item[]) {
  const norm = normalizeForHash(list)
  return sha256Hex(JSON.stringify(norm))
}

  // 最新dirtyをイベントで参照するためのref
  const dirtyRef = useRef(false)

  // 初回だけ初期値を固定
useEffect(() => {
  if (!baseRef.current) {
    // 初期状態＝DB状態として base を固定
    baseRef.current = JSON.stringify(normalizeForCompare(items))

    // ✅ 初期状態の items_hash を保存（DocumentActions 用）
   ;(async () => {
     if (typeof window === 'undefined') return
     try {
       const h = await computeItemsHash(items)
       localStorage.setItem(HASH_KEY, h)
     } catch {}
   })()
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [])

  // 現在の状態と比較して dirty を算出
  const dirty = useMemo(() => {
    const now = JSON.stringify(normalizeForCompare(items))
    return baseRef.current !== '' && now !== baseRef.current
  }, [items])

  // ✅ dirty => localStorage に反映（保存完了で自動的に消える）
  useEffect(() => {
    if (typeof window === 'undefined') return

    if (dirty) {
      localStorage.setItem(DIRTY_KEY, '1')
    } else {
      localStorage.removeItem(DIRTY_KEY)
    }

  }, [dirty, DIRTY_KEY])


  // refに同期
  useEffect(() => {
    dirtyRef.current = dirty
  }, [dirty])

  // タブ閉じ/更新で警告
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
    // position を常に 1..N に振り直す（表示順＝position）
    return items.map((it, idx) => ({ ...it, position: idx + 1 }))
  }, [items])

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
  setItems((prev) => {
    const target = prev[index]
    if (target?.id && isUuid(target.id)) {
      setDeleteIds((d) => [...d, target.id!]) // ✅ 既存uuidだけ積む
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

const newItems: Item[] = (json.items ?? [])
  .map((it: any) => ({
    id: it.id,
    position: Number(it.position ?? 0),
    description: it.description ?? '',
    quantity: Number(it.quantity ?? 0),
    unit_price_amount: Number(it.unit_price_amount ?? 0),
  }))
  // ✅ 念のため position でソートして「並び」を確定
  .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))

setItems(newItems)
setDeleteIds([])
setOk('保存しました')

   baseRef.current = JSON.stringify(normalizeForCompare(newItems))
 try { localStorage.removeItem(DIRTY_KEY) } catch {}

 try {
   const h = await computeItemsHash(newItems)
   localStorage.setItem(HASH_KEY, h)
 } catch {}

 return true

  } catch (e: any) {
    setErr(e?.message ?? String(e))
    return false
  } finally {
    setBusy(false)
  }
}

const saveAndBack = async () => {
  if (!dirtyRef.current) {
    router.push('/documents/' + documentId)
    return
  }
  const ok = await save()
  if (ok) router.push('/documents/' + documentId)
}

const discardAndBack = () => {
  const ok = confirm('保存していない変更を破棄して戻りますか？')
  if (!ok) return
  try { localStorage.removeItem(DIRTY_KEY) } catch {}
  router.push('/documents/' + documentId)
}


  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h2>Edit Items</h2>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
  <button type="button" onClick={saveAndBack} disabled={busy} style={btn}>
    保存して戻る
  </button>
  <button type="button" onClick={discardAndBack} disabled={busy} style={btn}>
    破棄して戻る
  </button>
</div>
      </div>

      {dirty && <p style={{ color: '#b45309' }}>未保存の変更があります</p>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button type="button" onClick={addRow} disabled={busy} style={btn}>
          行追加
        </button>
        <button type="button" onClick={save} disabled={busy} style={btn}>
          {busy ? '保存中…' : '保存'}
        </button>
      </div>

      {err && <p style={{ color: 'crimson' }}>{err}</p>}
      {ok && <p style={{ color: 'green' }}>{ok}</p>}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={th}>#</th>
            <th style={th}>Description</th>
            <th style={{ ...th, textAlign: 'right' }}>Qty</th>
            <th style={{ ...th, textAlign: 'right' }}>Unit</th>
            <th style={th}>Controls</th>
            <th style={th}></th>
          </tr>
        </thead>

        <tbody>
          {normalized.map((it, idx) => (
            <tr key={it.id ?? `new-${idx}`}>
              <td style={td}>{it.position}</td>

              <td style={td}>
                <input
                  value={it.description ?? ''}
                  onChange={(e) => updateField(idx, 'description', e.target.value)}
                  style={input}
                />
              </td>

              <td style={{ ...td, textAlign: 'right' }}>
                <input
                  type="number"
                  value={it.quantity ?? 0}
                  onChange={(e) => updateField(idx, 'quantity', e.target.value)}
                  style={{ ...input, textAlign: 'right', width: 100 }}
                />
              </td>

              <td style={{ ...td, textAlign: 'right' }}>
                <input
                  type="number"
                  value={it.unit_price_amount ?? 0}
                  onChange={(e) => updateField(idx, 'unit_price_amount', e.target.value)}
                  style={{ ...input, textAlign: 'right', width: 140 }}
                />
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
                <button type="button" onClick={() => removeRow(idx)} disabled={busy} style={btnSmall}>
                  削除
                </button>
              </td>
            </tr>
          ))}

          {normalized.length === 0 && (
            <tr>
              <td style={td} colSpan={6}>
                No items
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

const btn = { padding: '8px 12px', border: '1px solid #ccc', borderRadius: 6, background: '#fff' } as const
const btnSmall = { padding: '6px 10px', border: '1px solid #ccc', borderRadius: 6, background: '#fff' } as const
const th = { textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 } as const
const td = { borderBottom: '1px solid #eee', padding: 8, verticalAlign: 'top' } as const
const input = { width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 6 } as const
