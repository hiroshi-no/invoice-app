'use client'

import { useEffect, useMemo, useState } from 'react'

export default function InvoiceHtmlPreview({
  html,
}: {
  html: string
}) {
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
  }, [html])

  const frameKey = useMemo(() => {
    return `preview-${html.length}-${html.slice(0, 120)}`
  }, [html])

  return (
    <div
      style={{
        marginTop: 20,
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        background: '#f3f4f6',
        padding: 16,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: '#111827',
          }}
        >
          プレビュー
        </div>

        <div
          style={{
            fontSize: 12,
            color: loading ? '#6b7280' : '#9ca3af',
          }}
        >
          {loading ? '更新中...' : '最新'}
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        {loading && (
          <div
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              zIndex: 2,
              fontSize: 12,
              color: '#374151',
              background: 'rgba(255,255,255,0.92)',
              border: '1px solid #e5e7eb',
              borderRadius: 999,
              padding: '6px 10px',
            }}
          >
            プレビューを更新しています...
          </div>
        )}

        <iframe
          key={frameKey}
          title="PDF preview"
          srcDoc={html}
          onLoad={() => setLoading(false)}
          style={{
            width: '100%',
            minHeight: 1120,
            border: '1px solid #d1d5db',
            borderRadius: 8,
            background: '#fff',
          }}
        />
      </div>
    </div>
  )
}