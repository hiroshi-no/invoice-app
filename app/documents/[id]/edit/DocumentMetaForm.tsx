'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

type Customer = { id: string; name: string }

export type DocumentMetaDraft = {
  customer_id?: string | null
  customer_name?: string | null
  customer_honorific?: '御中' | '様' | null
  title?: string | null
  notes?: string | null
  due_date?: string | null
}

function getDueDateLabel(docType?: string | null) {
  const v = String(docType ?? '').toLowerCase()
  return v === 'quote' || v === 'quotation' ? '有効期限' : '支払期日'
}

function getTitlePlaceholder(docType?: string | null) {
  const v = String(docType ?? '').toLowerCase()
  return v === 'quote' || v === 'quotation'
    ? '例）Webサイト制作お見積書'
    : '例）2026年3月分 ご請求書'
}

export function DocumentMetaForm({
  documentId,
  initial,
  customers,
  onDraftChange,
  docType,
}: {
  documentId: string
  initial: DocumentMetaDraft
  customers: Customer[]
  onDraftChange?: (draft: DocumentMetaDraft) => void
  docType?: string | null
}) {
  const router = useRouter()

  const DIRTY_KEY = useMemo(() => `invoice:doc:${documentId}:meta_dirty`, [documentId])
  const dueDateLabel = getDueDateLabel(docType)
  const titlePlaceholder = getTitlePlaceholder(docType)

  const normalize = (v: DocumentMetaDraft & { customer_id?: string | null }) => ({
    customer_id: String(v.customer_id ?? ''),
    customer_name: String(v.customer_name ?? ''),
    customer_honorific: String(v.customer_honorific ?? ''),
    title: String(v.title ?? ''),
    notes: String(v.notes ?? ''),
    due_date: String(v.due_date ?? ''),
  })

  const initialNormalized = useMemo(
    () =>
      normalize({
        customer_id: initial.customer_id ?? '',
        customer_name: initial.customer_name ?? '',
        customer_honorific: initial.customer_honorific ?? null,
        title: initial.title ?? '',
        notes: initial.notes ?? '',
        due_date: initial.due_date ?? '',
      }),
    [
      initial.customer_id,
      initial.customer_name,
      initial.customer_honorific,
      initial.title,
      initial.notes,
      initial.due_date,
    ]
  )

  const initialBaseState = useMemo(
    () => JSON.stringify(initialNormalized),
    [initialNormalized]
  )

  const [customerId, setCustomerId] = useState(initial.customer_id ?? '')
  const [customerName, setCustomerName] = useState(initial.customer_name ?? '')
  const [customerHonorific, setCustomerHonorific] = useState(initial.customer_honorific ?? '')
  const [title, setTitle] = useState(initial.title ?? '')
  const [notes, setNotes] = useState(initial.notes ?? '')
  const [dueDate, setDueDate] = useState(initial.due_date ?? '')

  const [customerList, setCustomerList] = useState<Customer[]>(customers ?? [])

  const [busy, setBusy] = useState(false)
  const [refreshingCustomers, setRefreshingCustomers] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const [baseState, setBaseState] = useState(initialBaseState)

  const dirtyRef = useRef(false)
  const didMountRef = useRef(false)

  useEffect(() => {
    setCustomerList(customers ?? [])
  }, [customers])

  const customerOptions = useMemo(() => customerList ?? [], [customerList])

  const currentDraft = useMemo<DocumentMetaDraft>(
    () => ({
      customer_id: customerId || null,
      customer_name: customerName || null,
      customer_honorific:
        customerHonorific === '御中' || customerHonorific === '様'
          ? customerHonorific
          : null,
      title: title || null,
      notes: notes || null,
      due_date: dueDate || null,
    }),
    [customerId, customerName, customerHonorific, title, notes, dueDate]
  )

  const currentNormalized = useMemo(
    () => normalize(currentDraft),
    [currentDraft]
  )

  useEffect(() => {
    onDraftChange?.(currentDraft)
  }, [currentDraft, onDraftChange])

  const dirty = useMemo(() => {
    return JSON.stringify(currentNormalized) !== baseState
  }, [currentNormalized, baseState])

  useEffect(() => {
    dirtyRef.current = dirty
  }, [dirty])

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true
      return
    }

    if (dirtyRef.current) return

    setCustomerId(initial.customer_id ?? '')
    setCustomerName(initial.customer_name ?? '')
    setCustomerHonorific(initial.customer_honorific ?? '')
    setTitle(initial.title ?? '')
    setNotes(initial.notes ?? '')
    setDueDate(initial.due_date ?? '')
    setBaseState(initialBaseState)

    setErr(null)
    setOk(null)

    try {
      localStorage.removeItem(DIRTY_KEY)
    } catch {}
  }, [
    initial.customer_id,
    initial.customer_name,
    initial.customer_honorific,
    initial.title,
    initial.notes,
    initial.due_date,
    initialBaseState,
    DIRTY_KEY,
  ])

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

  const handleCustomerChange = (nextId: string) => {
    setErr(null)
    setOk(null)
    setCustomerId(nextId)

    const found = customerOptions.find((c) => c.id === nextId)
    if (found) {
      setCustomerName(found.name)
    }
  }

  const refreshCustomers = async () => {
    setErr(null)
    setOk(null)
    setRefreshingCustomers(true)

    try {
      const res = await fetch('/api/customers', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      })

      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErr(`HTTP ${res.status}: ${json.message ?? json.error ?? 'error'}`)
        return
      }

      const nextCustomers = Array.isArray(json?.customers) ? (json.customers as Customer[]) : []
      setCustomerList(nextCustomers)
      setOk('顧客一覧を更新しました')
    } catch (e: any) {
      setErr(e?.message ?? String(e))
    } finally {
      setRefreshingCustomers(false)
    }
  }

  const saveMeta = async (): Promise<boolean> => {
    setErr(null)
    setOk(null)
    setBusy(true)

    try {
      const payload: DocumentMetaDraft = {
        customer_id: customerId ? customerId : null,
        customer_name: customerName ? customerName : null,
        customer_honorific:
          customerHonorific === '御中' || customerHonorific === '様'
            ? customerHonorific
            : null,
        title: title ? title : null,
        notes: notes ? notes : null,
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
        return false
      }

      const savedDraft = {
        customer_id: payload.customer_id ?? '',
        customer_name: payload.customer_name ?? '',
        customer_honorific: payload.customer_honorific ?? '',
        title: payload.title ?? '',
        notes: payload.notes ?? '',
        due_date: payload.due_date ?? '',
      }

      setBaseState(JSON.stringify(normalize(savedDraft)))
      setOk('書類情報を保存しました')

      try {
        localStorage.removeItem(DIRTY_KEY)
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
    <div style={rootCard}>
      <div style={sectionCardEmphasis}>
        <div style={sectionTitle}>基本項目</div>
        <div style={sectionDescription}>
          まずは請求先、帳票タイトル、{dueDateLabel}を設定します。
        </div>

        <div style={fieldGrid}>
          <label style={fieldWrap}>
            <span style={labelText}>顧客マスタから選択</span>
            <select
              value={customerId}
              onChange={(e) => handleCustomerChange(e.target.value)}
              style={input}
              disabled={busy || refreshingCustomers}
            >
              <option value="">（未選択）</option>
              {customerOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <div style={helpText}>
              顧客を選ぶと、下の「書類に表示する請求先名」に自動入力されます。必要に応じて書類ごとに上書きできます。
            </div>

            <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Link
                href="/customers/new"
                target="_blank"
                rel="noopener noreferrer"
                style={subActionBtn}
              >
                顧客を新規作成
              </Link>

              <button
                type="button"
                onClick={refreshCustomers}
                disabled={busy || refreshingCustomers}
                style={subActionButton}
              >
                {refreshingCustomers ? '顧客一覧を更新中…' : '顧客一覧を更新'}
              </button>
            </div>
          </label>

          <label style={fieldWrap}>
            <span style={labelText}>書類に表示する請求先名</span>
            <input
              value={customerName}
              onChange={(e) => {
                setErr(null)
                setOk(null)
                setCustomerName(e.target.value)
              }}
              style={input}
              disabled={busy}
              placeholder="株式会社テスト"
            />
          </label>

          <label style={fieldWrap}>
            <span style={labelText}>請求先敬称</span>
            <select
              value={customerHonorific}
              onChange={(e) => {
                setErr(null)
                setOk(null)
                setCustomerHonorific(e.target.value)
              }}
              style={input}
              disabled={busy}
            >
              <option value="">なし</option>
              <option value="御中">御中</option>
              <option value="様">様</option>
            </select>

            <div style={helpText}>
              法人宛ては「御中」、個人宛ては「様」を選ぶ想定です。
            </div>
          </label>

          <label style={fieldWrap}>
            <span style={labelText}>帳票タイトル</span>
            <input
              value={title}
              onChange={(e) => {
                setErr(null)
                setOk(null)
                setTitle(e.target.value)
              }}
              style={input}
              disabled={busy}
              placeholder={titlePlaceholder}
            />
          </label>

          <label style={fieldWrap}>
            <span style={labelText}>{dueDateLabel}</span>
            <input
              type="date"
              value={dueDate ?? ''}
              onChange={(e) => {
                setErr(null)
                setOk(null)
                setDueDate(e.target.value)
              }}
              style={input}
              disabled={busy}
            />
          </label>
        </div>
      </div>

      <div style={sectionCard}>
        <div style={sectionTitle}>補足情報</div>
        <div style={sectionDescription}>
          必要に応じて備考を入力します。PDF下部にも反映されます。
        </div>

        <label style={fieldWrap}>
          <span style={labelText}>備考</span>
          <textarea
            value={notes}
            onChange={(e) => {
              setErr(null)
              setOk(null)
              setNotes(e.target.value)
            }}
            style={{ ...input, minHeight: 100, resize: 'vertical' }}
            disabled={busy}
            placeholder="振込先や補足事項など"
          />
        </label>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <button type="button" onClick={saveMeta} disabled={busy} style={btn}>
          {busy ? '保存中…' : '書類情報を保存'}
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

      {err && <p style={{ color: 'crimson', margin: 0, whiteSpace: 'pre-wrap' }}>{err}</p>}
      {ok && <p style={{ color: 'green', margin: 0 }}>{ok}</p>}
    </div>
  )
}

const rootCard: React.CSSProperties = {
  border: '1px solid #eee',
  borderRadius: 12,
  padding: 16,
  background: '#fff',
}

const sectionCardEmphasis: React.CSSProperties = {
  padding: 16,
  border: '1px solid #dbeafe',
  borderRadius: 12,
  background: '#f8fbff',
  display: 'grid',
  gap: 14,
}

const sectionCard: React.CSSProperties = {
  marginTop: 14,
  padding: 16,
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  background: '#fff',
  display: 'grid',
  gap: 14,
}

const sectionTitle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  color: '#111827',
}

const sectionDescription: React.CSSProperties = {
  fontSize: 12,
  color: '#6b7280',
  lineHeight: 1.6,
}

const fieldGrid: React.CSSProperties = {
  display: 'grid',
  gap: 14,
}

const fieldWrap: React.CSSProperties = {
  display: 'grid',
  gap: 6,
}

const labelText: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: '#374151',
}

const helpText: React.CSSProperties = {
  fontSize: 12,
  color: '#666',
  lineHeight: 1.6,
}

const input: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #d1d5db',
  borderRadius: 10,
  display: 'block',
  background: '#fff',
  color: '#111827',
  boxSizing: 'border-box',
  fontSize: 14,
}

const btn: React.CSSProperties = {
  padding: '10px 14px',
  border: '1px solid #ccc',
  borderRadius: 10,
  background: '#fff',
  fontSize: 14,
  fontWeight: 600,
}

const subActionBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '8px 12px',
  border: '1px solid #d1d5db',
  borderRadius: 8,
  background: '#fff',
  color: '#111827',
  textDecoration: 'none',
  fontSize: 13,
  fontWeight: 500,
}

const subActionButton: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '8px 12px',
  border: '1px solid #d1d5db',
  borderRadius: 8,
  background: '#fff',
  color: '#111827',
  textDecoration: 'none',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
}