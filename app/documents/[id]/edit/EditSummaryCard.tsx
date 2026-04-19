'use client'

import { useEffect, useMemo, useState } from 'react'

function fmtMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${amount.toLocaleString()} ${currency}`
  }
}

function fmtDate(value?: string) {
  const s = String(value ?? '').trim()
  if (!s) return '—'
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return s
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

function resolveDueLabel(docType?: string, title?: string) {
  const dt = String(docType ?? '').trim().toLowerCase()
  const t = String(title ?? '').trim()

  if (dt === 'quote' || dt === 'quotation') return '有効期限'
  if (dt === 'invoice') return '支払期日'
  if (t.includes('見積')) return '有効期限'
  return '支払期日'
}

function formatTemplateProfile(value?: string) {
  if (value === 'creator') return 'フリーランス制作者向け'
  if (value === 'interior') return '内装・小規模工事向け'
  return '標準'
}

export default function EditSummaryCard({
  documentId,
  documentNo,
  docType,
  templateProfile,
  currency,
  title,
  dueDate,
  customerName,
  honorific,
  itemCount,
  subtotal,
  tax,
  total,
}: {
  documentId: string
  documentNo: string
  docType?: string
  templateProfile: string
  currency: string
  title: string
  dueDate: string
  customerName: string
  honorific: string
  itemCount: number
  subtotal: number
  tax: number
  total: number
}) {
  const metaKey = useMemo(() => `invoice:doc:${documentId}:meta_dirty`, [documentId])
  const itemsKey = useMemo(() => `invoice:doc:${documentId}:items_dirty`, [documentId])

  const [metaDirty, setMetaDirty] = useState(false)
  const [itemsDirty, setItemsDirty] = useState(false)

  useEffect(() => {
    const readDirty = () => {
      if (typeof window === 'undefined') return
      setMetaDirty(localStorage.getItem(metaKey) === '1')
      setItemsDirty(localStorage.getItem(itemsKey) === '1')
    }

    readDirty()

    const onFocus = () => readDirty()
    const onStorage = () => readDirty()

    window.addEventListener('focus', onFocus)
    window.addEventListener('storage', onStorage)

    const timer = window.setInterval(readDirty, 400)

    return () => {
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('storage', onStorage)
      window.clearInterval(timer)
    }
  }, [metaKey, itemsKey])

  const customerLabel = [customerName, honorific].filter(Boolean).join(' ')
  const dueLabel = resolveDueLabel(docType, title)

  return (
    <aside
      style={{
        position: 'sticky',
        top: 96,
        alignSelf: 'start',
      }}
    >
      <div
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          background: '#fff',
          padding: 16,
          boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
        }}
      >
        <h2
          style={{
            margin: '0 0 14px 0',
            fontSize: 16,
            fontWeight: 700,
            color: '#111827',
          }}
        >
          サマリー
        </h2>

        <div style={{ display: 'grid', gap: 10 }}>
          <SummaryRow label="書類番号" value={documentNo || '—'} />
          <SummaryRow label="帳票タイプ" value={formatTemplateProfile(templateProfile)} />
          <SummaryRow label="帳票タイトル" value={title || '—'} />
          <SummaryRow label="通貨" value={currency} />
          <SummaryRow label="請求先" value={customerLabel || '—'} />
          <SummaryRow label={dueLabel} value={fmtDate(dueDate)} />
          <SummaryRow label="明細件数" value={`${itemCount}件`} />
        </div>

        <div
          style={{
            marginTop: 14,
            paddingTop: 14,
            borderTop: '1px solid #f1f5f9',
            display: 'grid',
            gap: 8,
          }}
        >
          <MoneyRow label="小計" value={fmtMoney(subtotal, currency)} />
          <MoneyRow label="消費税" value={fmtMoney(tax, currency)} />
          <MoneyRow
            label="合計"
            value={fmtMoney(total, currency)}
            strong
          />
        </div>

        <div
          style={{
            marginTop: 14,
            paddingTop: 14,
            borderTop: '1px solid #f1f5f9',
            display: 'grid',
            gap: 8,
          }}
        >
          <StatusPill label="書類情報" dirty={metaDirty} />
          <StatusPill label="明細" dirty={itemsDirty} />
        </div>

        <div
          style={{
            marginTop: 14,
            paddingTop: 14,
            borderTop: '1px solid #f1f5f9',
            fontSize: 12,
            color: '#6b7280',
            lineHeight: 1.6,
          }}
        >
          ※ サマリーは編集中の入力内容をリアルタイムで反映します。
        </div>
      </div>
    </aside>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
        alignItems: 'flex-start',
      }}
    >
      <div style={{ fontSize: 13, color: '#6b7280' }}>{label}</div>
      <div
        style={{
          fontSize: 13,
          color: '#111827',
          fontWeight: 600,
          textAlign: 'right',
          wordBreak: 'break-word',
        }}
      >
        {value}
      </div>
    </div>
  )
}

function MoneyRow({
  label,
  value,
  strong = false,
}: {
  label: string
  value: string
  strong?: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
        alignItems: 'center',
      }}
    >
      <div
        style={{
          fontSize: strong ? 14 : 13,
          color: strong ? '#111827' : '#6b7280',
          fontWeight: strong ? 700 : 600,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: strong ? 16 : 13,
          color: '#111827',
          fontWeight: strong ? 800 : 700,
          textAlign: 'right',
        }}
      >
        {value}
      </div>
    </div>
  )
}

function StatusPill({
  label,
  dirty,
}: {
  label: string
  dirty: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
        alignItems: 'center',
      }}
    >
      <div style={{ fontSize: 13, color: '#6b7280' }}>{label}</div>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '4px 8px',
          borderRadius: 999,
          border: '1px solid #e5e7eb',
          background: dirty ? '#fff7ed' : '#f9fafb',
          color: dirty ? '#b45309' : '#374151',
          fontSize: 12,
          fontWeight: 700,
          whiteSpace: 'nowrap',
        }}
      >
        {dirty ? '未保存' : '保存済み'}
      </span>
    </div>
  )
}