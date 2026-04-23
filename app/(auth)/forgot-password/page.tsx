'use client'

import Link from 'next/link'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/browser'

export default function ForgotPasswordPage() {
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const onSubmit = async () => {
    if (busy) return

    setBusy(true)
    setMsg(null)
    setErr(null)

    try {
      const redirectTo = 'https://seikyunote.com/update-password'

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      })

      if (error) {
        setErr(error.message)
        return
      }

      setMsg('パスワード再設定メールを送信しました。メールをご確認ください。')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      style={{
        maxWidth: 420,
        margin: '40px auto',
        fontFamily: 'sans-serif',
        padding: '0 16px',
      }}
    >
      <h1 style={{ marginBottom: 12 }}>パスワード再設定</h1>

      <p style={{ color: '#6b7280', lineHeight: 1.7, marginBottom: 16 }}>
        登録済みのメールアドレスを入力してください。パスワード再設定用のメールを送信します。
      </p>

      <div style={{ display: 'grid', gap: 10 }}>
        <input
          placeholder="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: '100%', padding: 10 }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSubmit()
          }}
        />

        <button
          onClick={onSubmit}
          disabled={busy}
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            border: '1px solid #111827',
            background: '#111827',
            color: '#fff',
            fontWeight: 700,
            cursor: busy ? 'default' : 'pointer',
          }}
        >
          {busy ? 'Sending...' : '再設定メールを送る'}
        </button>
      </div>

      <div style={{ marginTop: 14 }}>
        <Link
          href="/login"
          style={{ fontSize: 14, color: '#2563eb', textDecoration: 'none' }}
        >
          ログイン画面に戻る
        </Link>
      </div>

      {msg && <p style={{ color: 'green', marginTop: 12 }}>{msg}</p>}
      {err && <p style={{ color: 'crimson', marginTop: 12 }}>{err}</p>}
    </div>
  )
}