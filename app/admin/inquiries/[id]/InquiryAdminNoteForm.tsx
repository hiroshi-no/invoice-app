'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

export function InquiryAdminNoteForm({
  inquiryId,
  initialAdminNote,
}: {
  inquiryId: string
  initialAdminNote: string | null | undefined
}) {
  const router = useRouter()
  const [value, setValue] = useState(initialAdminNote ?? '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const maxLength = 5000

  const remaining = useMemo(() => maxLength - value.length, [value])

  async function saveNote() {
    if (saving) return

    setSaving(true)
    setMessage('')

    try {
      const res = await fetch(`/api/admin/inquiries/${inquiryId}/note`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminNote: value,
        }),
      })

      const json = await res.json().catch(() => null)

      if (!res.ok || !json?.ok) {
        throw new Error(json?.detail || json?.error || 'note_save_failed')
      }

      setMessage('保存しました。')
      router.refresh()
    } catch (err: any) {
      setMessage(err?.message || '内部メモの保存に失敗しました。')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ fontSize: 14, fontWeight: 700 }}>内部メモ</div>

      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value.slice(0, maxLength))}
        rows={10}
        placeholder="対応メモ、返信方針、確認事項などを入力"
        style={{
          width: '100%',
          minHeight: 180,
          borderRadius: 12,
          border: '1px solid #d1d5db',
          padding: 12,
          fontSize: 14,
          lineHeight: 1.7,
          resize: 'vertical',
          background: '#fff',
        }}
      />

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
            fontSize: 12,
            color: remaining < 200 ? '#b45309' : '#6b7280',
          }}
        >
          残り {remaining} 文字
        </div>

        <button
          type="button"
          onClick={saveNote}
          disabled={saving}
          style={{
            height: 40,
            padding: '0 14px',
            borderRadius: 10,
            border: '1px solid #111827',
            background: '#111827',
            color: '#fff',
            cursor: saving ? 'wait' : 'pointer',
          }}
        >
          {saving ? '保存中…' : '内部メモを保存'}
        </button>
      </div>

      {message ? (
        <div
          style={{
            fontSize: 13,
            color: message === '保存しました。' ? '#166534' : '#b91c1c',
            lineHeight: 1.6,
          }}
        >
          {message}
        </div>
      ) : null}
    </div>
  )
}