'use client'

import { useState } from 'react'

export default function PdfSaveButton({
  documentId,
  onSaved,
  compact = false,
}: {
  documentId: string
  onSaved?: () => void
  compact?: boolean
}) {
  const [busy, setBusy] = useState(false)

  const handleSave = async () => {
    if (busy) return

    const metaDirtyKey = `invoice:doc:${documentId}:meta_dirty`
    const itemsDirtyKey = `invoice:doc:${documentId}:items_dirty`

    const metaDirty =
      typeof window !== 'undefined' && localStorage.getItem(metaDirtyKey) === '1'
    const itemsDirty =
      typeof window !== 'undefined' && localStorage.getItem(itemsDirtyKey) === '1'

    if (metaDirty || itemsDirty) {
      const targets = [
        metaDirty ? '書類情報' : null,
        itemsDirty ? '明細' : null,
      ].filter(Boolean)

      window.alert(
        `${targets.join('・')} に未保存の変更があります。先に保存してください。`
      )
      return
    }

    setBusy(true)
    try {
      const hashRes = await fetch(`/api/documents/${documentId}/items-hash`, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      })

      const hashJson = await hashRes.json().catch(() => ({}))
      if (!hashRes.ok) {
        window.alert(
          hashJson?.message ?? `明細ハッシュ取得に失敗しました（HTTP ${hashRes.status}）`
        )
        return
      }

      const serverHash =
        String(hashJson?.hash ?? hashJson?.itemsHash ?? '').trim()

      if (!serverHash) {
        window.alert('明細ハッシュを取得できませんでした。')
        return
      }

      const res = await fetch(`/api/documents/${documentId}/pdf/save`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'x-items-hash': serverHash,
          'x-confirm-saved-items': '1',
        },
      })

      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        window.alert(json?.message ?? `PDF保存に失敗しました（HTTP ${res.status}）`)
        return
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('invoice:pdf-saved', {
            detail: { documentId },
          })
        )
      }

      onSaved?.()
      window.alert('PDFを保存しました')
    } catch (e: any) {
      window.alert(e?.message ?? 'PDF保存に失敗しました')
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleSave}
      disabled={busy}
      style={{
        padding: compact ? '7px 10px' : '8px 12px',
        border: '1px solid #d1d5db',
        borderRadius: 8,
        background: '#fff',
        color: '#111827',
        fontSize: 13,
        fontWeight: 600,
        cursor: busy ? 'default' : 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      {busy ? 'PDF保存中…' : 'PDFを保存'}
    </button>
  )
}