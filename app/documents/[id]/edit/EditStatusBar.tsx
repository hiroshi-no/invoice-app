'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import PdfSaveButton from './PdfSaveButton'
import PreviewPdfButton from './PreviewPdfButton'

export default function EditStatusBar({
  documentId,
  documentNo,
  currency,
}: {
  documentId: string
  documentNo: string
  currency: string
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

    const timer = window.setInterval(readDirty, 500)

    return () => {
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('storage', onStorage)
      window.clearInterval(timer)
    }
  }, [metaKey, itemsKey])

  const hasDirty = metaDirty || itemsDirty

  const handleBackClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!hasDirty) return

    const ok = window.confirm(
      '未保存の変更があります。このまま戻ると保存されません。戻りますか？'
    )
    if (!ok) {
      e.preventDefault()
    }
  }

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        background: 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(8px)',
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
        boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <StatusChip label="書類番号" value={documentNo} />
          <StatusChip label="通貨" value={currency} />
          <DirtyChip label="書類情報" dirty={metaDirty} />
          <DirtyChip label="明細" dirty={itemsDirty} />
        </div>

        <div
          style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <PreviewPdfButton documentId={documentId} compact />

          <PdfSaveButton documentId={documentId} compact />

          <Link
            href={`/documents/${documentId}`}
            onClick={handleBackClick}
            style={actionLink}
          >
            発行画面へ
          </Link>
        </div>
      </div>
    </div>
  )
}

function StatusChip({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 10px',
        borderRadius: 999,
        background: '#f9fafb',
        border: '1px solid #e5e7eb',
        fontSize: 12,
      }}
    >
      <span style={{ color: '#6b7280', fontWeight: 600 }}>{label}</span>
      <span style={{ color: '#111827', fontWeight: 700 }}>{value || '—'}</span>
    </div>
  )
}

function DirtyChip({
  label,
  dirty,
}: {
  label: string
  dirty: boolean
}) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 10px',
        borderRadius: 999,
        background: dirty ? '#fff7ed' : '#f9fafb',
        border: '1px solid #e5e7eb',
        fontSize: 12,
      }}
    >
      <span style={{ color: '#6b7280', fontWeight: 600 }}>{label}</span>
      <span style={{ color: dirty ? '#b45309' : '#374151', fontWeight: 700 }}>
        {dirty ? '未保存' : '保存済み'}
      </span>
    </div>
  )
}

const actionLink = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '7px 10px',
  border: '1px solid #d1d5db',
  borderRadius: 8,
  background: '#fff',
  color: '#111827',
  textDecoration: 'none',
  fontSize: 13,
  fontWeight: 600,
  whiteSpace: 'nowrap',
} as const