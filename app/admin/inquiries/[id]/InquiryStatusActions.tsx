'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type InquiryStatus = 'new' | 'in_progress' | 'done'

export function InquiryStatusActions({
  inquiryId,
  currentStatus,
}: {
  inquiryId: string
  currentStatus: InquiryStatus | string | null | undefined
}) {
  const router = useRouter()
  const [loading, setLoading] = useState<InquiryStatus | null>(null)
  const [error, setError] = useState<string>('')

  async function updateStatus(nextStatus: InquiryStatus) {
    if (loading) return

    setLoading(nextStatus)
    setError('')

    try {
      const res = await fetch(`/api/admin/inquiries/${inquiryId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: nextStatus }),
      })

      const json = await res.json().catch(() => null)

      if (!res.ok || !json?.ok) {
        throw new Error(json?.detail || json?.error || 'status_update_failed')
      }

      router.refresh()
    } catch (err: any) {
      setError(err?.message || 'ステータス更新に失敗しました。')
    } finally {
      setLoading(null)
    }
  }

  function buttonStyle(
    target: InquiryStatus,
    active: boolean
  ): React.CSSProperties {
    return {
      height: 40,
      padding: '0 14px',
      borderRadius: 10,
      border: active ? '1px solid #111827' : '1px solid #d1d5db',
      background: active ? '#111827' : '#fff',
      color: active ? '#fff' : '#111827',
      cursor: loading ? 'wait' : 'pointer',
      opacity: loading && loading !== target ? 0.7 : 1,
    }
  }

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ fontSize: 14, fontWeight: 700 }}>ステータス変更</div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => updateStatus('new')}
          disabled={!!loading}
          style={buttonStyle('new', currentStatus === 'new')}
        >
          {loading === 'new' ? '更新中…' : '未対応'}
        </button>

        <button
          type="button"
          onClick={() => updateStatus('in_progress')}
          disabled={!!loading}
          style={buttonStyle('in_progress', currentStatus === 'in_progress')}
        >
          {loading === 'in_progress' ? '更新中…' : '対応中'}
        </button>

        <button
          type="button"
          onClick={() => updateStatus('done')}
          disabled={!!loading}
          style={buttonStyle('done', currentStatus === 'done')}
        >
          {loading === 'done' ? '更新中…' : '完了'}
        </button>
      </div>

      {error ? (
        <div style={{ fontSize: 13, color: '#b91c1c', lineHeight: 1.6 }}>
          {error}
        </div>
      ) : null}
    </div>
  )
}