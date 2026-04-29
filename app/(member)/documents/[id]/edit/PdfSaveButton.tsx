'use client'

import { useState } from 'react'

type TemplateProfile = 'standard' | 'creator' | 'interior'

type LivePreviewPayload = {
  customer_id?: string | null
  customer_name?: string | null
  customer_honorific?: string | null
  title?: string | null
  notes?: string | null
  due_date?: string | null
  template_profile?: string | null
  extended_meta?: Record<string, unknown> | null
}

function nullableText(value: unknown) {
  if (value == null) return null
  const s = String(value).trim()
  return s ? s : null
}

function normalizeHonorific(value: unknown): '御中' | '様' | null {
  const s = String(value ?? '').trim()
  if (s === '御中' || s === '様') return s
  return null
}

function normalizeTemplateProfile(value: unknown): TemplateProfile {
  const s = String(value ?? '').trim()
  if (s === 'creator' || s === 'interior' || s === 'standard') return s
  return 'standard'
}

function toObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

async function saveLiveMetaBeforePdf(documentId: string) {
  if (typeof window === 'undefined') return null

  const live = (window as any).__invoicePreviewState?.[documentId] as
    | LivePreviewPayload
    | undefined

  if (!live) {
    throw new Error(
      '書類情報の現在値を取得できませんでした。先に「書類情報を保存」を押してください。'
    )
  }

  const payload = {
    customer_id: nullableText(live.customer_id),
    customer_name: nullableText(live.customer_name),
    customer_honorific: normalizeHonorific(live.customer_honorific),
    title: nullableText(live.title),
    notes: nullableText(live.notes),
    due_date: nullableText(live.due_date),
    template_profile: normalizeTemplateProfile(live.template_profile),
    extended_meta: toObject(live.extended_meta),
  }

  const res = await fetch(`/api/documents/${documentId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  })

  const json = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new Error(json?.message ?? json?.error ?? '書類情報の保存に失敗しました')
  }

  try {
    localStorage.removeItem(`invoice:doc:${documentId}:meta_dirty`)

    window.dispatchEvent(
      new CustomEvent('invoice:doc-meta-saved', {
        detail: {
          documentId,
          draft: payload,
        },
      })
    )

    window.dispatchEvent(new Event('storage'))
  } catch {}

  return payload
}

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

    if (itemsDirty) {
      window.alert('明細に未保存の変更があります。先に明細を保存してください。')
      return
    }

    setBusy(true)

    try {
      if (metaDirty) {
        await saveLiveMetaBeforePdf(documentId)
      }

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