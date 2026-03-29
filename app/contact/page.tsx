'use client'

import Link from 'next/link'
import { useState } from 'react'

function isValidEmail(email: string) {
  return /\S+@\S+\.\S+/.test(email)
}

export default function ContactPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')

  const [busy, setBusy] = useState(false)
  const [ok, setOk] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const onSubmit = async () => {
    if (busy) return

    setErr(null)
    setOk(null)

    const normalizedName = name.trim()
    const normalizedEmail = email.trim()
    const normalizedSubject = subject.trim()
    const normalizedMessage = message.trim()

    if (!normalizedName) {
      setErr('お名前を入力してください。')
      return
    }

    if (!normalizedEmail) {
      setErr('メールアドレスを入力してください。')
      return
    }

    if (!isValidEmail(normalizedEmail)) {
      setErr('メールアドレスの形式が正しくありません。')
      return
    }

    if (!normalizedSubject) {
      setErr('件名を入力してください。')
      return
    }

    if (!normalizedMessage) {
      setErr('お問い合わせ内容を入力してください。')
      return
    }

    setBusy(true)

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          name: normalizedName,
          email: normalizedEmail,
          subject: normalizedSubject,
          message: normalizedMessage,
        }),
      })

      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        setErr(String(json?.message ?? json?.error ?? 'お問い合わせ送信に失敗しました。'))
        return
      }

      setOk('お問い合わせを送信しました。内容を確認のうえ、順次対応いたします。')
      setName('')
      setEmail('')
      setSubject('')
      setMessage('')
    } catch (e: any) {
      setErr(String(e?.message ?? 'お問い合わせ送信に失敗しました。'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main
      style={{
        maxWidth: 760,
        margin: '40px auto',
        padding: '0 16px',
        fontFamily: 'sans-serif',
      }}
    >
      <div
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: 16,
          background: '#fff',
          padding: 24,
          boxShadow: '0 6px 24px rgba(0,0,0,0.05)',
        }}
      >
        <h1 style={{ marginTop: 0, marginBottom: 10 }}>お問い合わせ</h1>

        <p
          style={{
            marginTop: 0,
            marginBottom: 20,
            color: '#4b5563',
            lineHeight: 1.7,
            fontSize: 14,
          }}
        >
          ご不明点やご要望がありましたら、下記フォームからお問い合わせください。
        </p>

        <div style={{ display: 'grid', gap: 14 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>お名前</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="山田 太郎"
              style={inputStyle}
              disabled={busy}
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>
              メールアドレス
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={inputStyle}
              disabled={busy}
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>件名</span>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="お問い合わせ件名"
              style={inputStyle}
              disabled={busy}
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>
              お問い合わせ内容
            </span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="お問い合わせ内容をご入力ください。"
              style={{ ...inputStyle, minHeight: 160, resize: 'vertical' }}
              disabled={busy}
            />
          </label>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              onClick={onSubmit}
              disabled={busy}
              style={{
                padding: '10px 16px',
                borderRadius: 10,
                border: '1px solid #111827',
                background: '#111827',
                color: '#fff',
                fontWeight: 700,
                cursor: busy ? 'default' : 'pointer',
              }}
            >
              {busy ? '送信中…' : '送信する'}
            </button>

            <Link
              href="/login"
              style={{
                textDecoration: 'none',
                color: '#2563eb',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              ログイン画面へ戻る
            </Link>
          </div>

          {ok && (
            <div
              style={{
                border: '1px solid #bbf7d0',
                background: '#f0fdf4',
                color: '#166534',
                borderRadius: 10,
                padding: '10px 12px',
                fontSize: 14,
                lineHeight: 1.6,
              }}
            >
              {ok}
            </div>
          )}

          {err && (
            <div
              style={{
                border: '1px solid #fecaca',
                background: '#fff1f2',
                color: '#991b1b',
                borderRadius: 10,
                padding: '10px 12px',
                fontSize: 14,
                lineHeight: 1.6,
              }}
            >
              {err}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #d1d5db',
  borderRadius: 10,
  background: '#fff',
  color: '#111827',
  boxSizing: 'border-box',
  fontSize: 14,
}