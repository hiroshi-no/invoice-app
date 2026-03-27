'use client'

import { useEffect, useRef, useState } from 'react'

type PreviewPayload = {
  customer_id?: string | null
  customer_name?: string | null
  customer_honorific?: string | null
  title?: string | null
  notes?: string | null
  due_date?: string | null
  items?: Array<{
    description?: string | null
    quantity?: number | null
    unit_price_amount?: number | null
    line_subtotal_amount?: number | null
  }>
}

declare global {
  interface Window {
    __invoicePreviewState?: Record<string, PreviewPayload>
  }
}

const CLIENT_PREVIEW_CACHE_TTL_MS = 60_000

function stableStringify(value: any): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value)
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`
  }

  const keys = Object.keys(value).sort()
  return `{${keys
    .map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`)
    .join(',')}}`
}

async function sha256Hex(text: string): Promise<string> {
  const enc = new TextEncoder()
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(text))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function computePayloadHash(payload: PreviewPayload): Promise<string> {
  return sha256Hex(stableStringify(payload))
}

export default function PreviewPdfButton({
  documentId,
  compact = false,
}: {
  documentId: string
  compact?: boolean
}) {
  const [busy, setBusy] = useState(false)
  const [cooldownSec, setCooldownSec] = useState(0)

  const lastPreviewRef = useRef<{
    hash: string
    url: string
    createdAt: number
  } | null>(null)

  useEffect(() => {
    if (cooldownSec <= 0) return

    const timer = window.setInterval(() => {
      setCooldownSec((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => window.clearInterval(timer)
  }, [cooldownSec])

  useEffect(() => {
    return () => {
      const last = lastPreviewRef.current
      if (last?.url) {
        URL.revokeObjectURL(last.url)
      }
    }
  }, [])

  const handleClick = async () => {
    if (busy || cooldownSec > 0) return

    const payload =
      typeof window !== 'undefined'
        ? window.__invoicePreviewState?.[documentId]
        : undefined

    const popup = window.open('', '_blank')
    if (!popup) {
      window.alert('ポップアップがブロックされました。ブラウザの設定をご確認ください。')
      return
    }

    popup.document.write(`
      <!doctype html>
      <html lang="ja">
        <head>
          <meta charset="utf-8" />
          <title>PDFプレビューを準備中...</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              padding: 24px;
              color: #111827;
              line-height: 1.6;
            }
          </style>
        </head>
        <body>
          PDFプレビューを準備しています...
        </body>
      </html>
    `)
    popup.document.close()

    // payload が無い場合は従来GET
    if (!payload) {
      popup.location.href = `/api/documents/${documentId}/pdf`
      return
    }

    setBusy(true)
    try {
      const payloadHash = await computePayloadHash(payload)
      const now = Date.now()
      const last = lastPreviewRef.current

      // 同一payload & TTL内なら再送せず前回のBlob URLを再利用
      if (
        last &&
        last.hash === payloadHash &&
        now - last.createdAt <= CLIENT_PREVIEW_CACHE_TTL_MS
      ) {
        popup.location.href = last.url
        return
      }

      const res = await fetch(`/api/documents/${documentId}/pdf`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        popup.close()

        if (res.status === 429) {
          const retryAfter =
            Number(json?.retry_after ?? json?.retryAfter ?? 10) || 10
          setCooldownSec(Math.max(1, retryAfter))
          window.alert(
            `PDFプレビューの実行回数が一時的な上限に達しました。${retryAfter}秒ほど待ってから再実行してください。`
          )
          return
        }

        window.alert(json?.message ?? `PDFプレビューに失敗しました（HTTP ${res.status}）`)
        return
      }

      const blob = await res.blob()
      const nextUrl = URL.createObjectURL(blob)

      const prev = lastPreviewRef.current
      if (prev?.url) {
        URL.revokeObjectURL(prev.url)
      }

      lastPreviewRef.current = {
        hash: payloadHash,
        url: nextUrl,
        createdAt: now,
      }

      popup.location.href = nextUrl
    } catch (e: any) {
      popup.close()
      window.alert(e?.message ?? 'PDFプレビューに失敗しました。')
    } finally {
      setBusy(false)
    }
  }

  const disabled = busy || cooldownSec > 0
  const label = busy
    ? 'PDF生成中…'
    : cooldownSec > 0
    ? `再試行まで ${cooldownSec}s`
    : 'PDFプレビュー'

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      style={{
        padding: compact ? '7px 10px' : '8px 12px',
        border: '1px solid #d1d5db',
        borderRadius: 8,
        background: disabled ? '#f9fafb' : '#fff',
        color: disabled ? '#6b7280' : '#111827',
        fontSize: 13,
        fontWeight: 600,
        cursor: disabled ? 'default' : 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  )
}