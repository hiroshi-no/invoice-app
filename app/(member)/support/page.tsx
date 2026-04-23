'use client'

import { useState } from 'react'

type SubmitState = 'idle' | 'submitting' | 'success'

export default function SupportPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<SubmitState>('idle')
  const [error, setError] = useState<string | null>(null)

  const resetForm = () => {
    setName('')
    setEmail('')
    setSubject('')
    setMessage('')
  }

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (status === 'submitting') return

    setError(null)

    if (!name.trim()) {
      setError('お名前を入力してください。')
      return
    }

    if (!email.trim()) {
      setError('メールアドレスを入力してください。')
      return
    }

    if (!/\S+@\S+\.\S+/.test(email.trim())) {
      setError('メールアドレスの形式が正しくありません。')
      return
    }

    if (!subject.trim()) {
      setError('件名を入力してください。')
      return
    }

    if (!message.trim()) {
      setError('お問い合わせ内容を入力してください。')
      return
    }

    setStatus('submitting')

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          subject: `[会員サポート] ${subject.trim()}`,
          message: message.trim(),
        }),
      })

      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(String(json?.message ?? json?.error ?? '送信に失敗しました。'))
      }

      resetForm()
      setStatus('success')
    } catch (e: any) {
      setError(String(e?.message ?? '送信に失敗しました。'))
      setStatus('idle')
    }
  }

  return (
    <div style={{ maxWidth: 760 }}>
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            margin: 0,
            fontSize: 28,
            fontWeight: 700,
            color: '#111827',
          }}
        >
          サポートへのお問い合わせ
        </h1>

        <p
          style={{
            marginTop: 12,
            marginBottom: 0,
            fontSize: 14,
            lineHeight: 1.8,
            color: '#4b5563',
          }}
        >
          Seikyu Note のご利用中に困ったことがあれば、こちらからご連絡ください。
          操作方法、表示崩れ、PDF出力、プランや請求に関するご相談などを受け付けています。
        </p>
      </div>

      <div
        style={{
          marginBottom: 20,
          padding: 16,
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          background: '#ffffff',
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 8, color: '#111827' }}>
          お問い合わせの例
        </div>
        <ul
          style={{
            margin: 0,
            paddingLeft: 18,
            color: '#4b5563',
            fontSize: 14,
            lineHeight: 1.8,
          }}
        >
          <li>PDFが保存できない、または表示が崩れる</li>
          <li>請求書・見積書の作成方法を確認したい</li>
          <li>料金プランや請求タイミングについて知りたい</li>
          <li>不具合の再現手順を共有したい</li>
        </ul>
      </div>

      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 16 }}>
        <div>
          <label
            htmlFor="support-name"
            style={{
              display: 'block',
              marginBottom: 6,
              fontSize: 14,
              fontWeight: 700,
              color: '#111827',
            }}
          >
            お名前
          </label>
          <input
            id="support-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="山田 太郎"
            style={{
              width: '100%',
              padding: 12,
              border: '1px solid #d1d5db',
              borderRadius: 8,
              background: '#fff',
              color: '#111827',
              outline: 'none',
            }}
          />
        </div>

        <div>
          <label
            htmlFor="support-email"
            style={{
              display: 'block',
              marginBottom: 6,
              fontSize: 14,
              fontWeight: 700,
              color: '#111827',
            }}
          >
            メールアドレス
          </label>
          <input
            id="support-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@example.com"
            autoComplete="email"
            style={{
              width: '100%',
              padding: 12,
              border: '1px solid #d1d5db',
              borderRadius: 8,
              background: '#fff',
              color: '#111827',
              outline: 'none',
            }}
          />
        </div>

        <div>
          <label
            htmlFor="support-subject"
            style={{
              display: 'block',
              marginBottom: 6,
              fontSize: 14,
              fontWeight: 700,
              color: '#111827',
            }}
          >
            件名
          </label>
          <input
            id="support-subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="例: PDF保存時にエラーが出る"
            style={{
              width: '100%',
              padding: 12,
              border: '1px solid #d1d5db',
              borderRadius: 8,
              background: '#fff',
              color: '#111827',
              outline: 'none',
            }}
          />
        </div>

        <div>
          <label
            htmlFor="support-message"
            style={{
              display: 'block',
              marginBottom: 6,
              fontSize: 14,
              fontWeight: 700,
              color: '#111827',
            }}
          >
            お問い合わせ内容
          </label>
          <textarea
            id="support-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={8}
            placeholder={`状況をできるだけ詳しくご記入ください。
例:
・何をしようとしたか
・どの画面で起きたか
・表示されたメッセージ
・再現する手順`}
            style={{
              width: '100%',
              padding: 12,
              border: '1px solid #d1d5db',
              borderRadius: 8,
              background: '#fff',
              color: '#111827',
              resize: 'vertical',
              outline: 'none',
              lineHeight: 1.6,
            }}
          />
        </div>

        <div
          style={{
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="submit"
            disabled={status === 'submitting'}
            style={{
              padding: '12px 16px',
              borderRadius: 8,
              border: '1px solid #111827',
              background: '#111827',
              color: '#fff',
              fontWeight: 700,
              cursor: status === 'submitting' ? 'default' : 'pointer',
            }}
          >
            {status === 'submitting' ? '送信中...' : '送信する'}
          </button>

          {status === 'success' ? (
            <span style={{ fontSize: 14, color: '#047857' }}>
              お問い合わせを送信しました。
            </span>
          ) : null}
        </div>

        {error ? (
          <div
            style={{
              fontSize: 14,
              color: '#b91c1c',
              padding: '10px 12px',
              border: '1px solid #fecaca',
              borderRadius: 8,
              background: '#fef2f2',
            }}
          >
            {error}
          </div>
        ) : null}
      </form>
    </div>
  )
}