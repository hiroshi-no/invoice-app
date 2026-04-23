'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/browser'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const supabase = createClient()

  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [busy, setBusy] = useState(false)
  const [ready, setReady] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const init = async () => {
      try {
        await supabase.auth.getSession()
      } finally {
        if (mounted) setReady(true)
      }
    }

    init()
    return () => {
      mounted = false
    }
  }, [supabase])

  const onUpdate = async () => {
    if (busy) return

    setBusy(true)
    setMsg(null)
    setErr(null)

    try {
      if (password.length < 8) {
        setErr('パスワードは8文字以上で入力してください。')
        return
      }

      if (password !== password2) {
        setErr('確認用パスワードが一致しません。')
        return
      }

      const { error } = await supabase.auth.updateUser({
        password,
      })

      if (error) {
        setErr(error.message)
        return
      }

      setMsg('パスワードを更新しました。ログイン画面へ移動します。')

      window.setTimeout(() => {
        router.push('/login')
      }, 1200)
    } finally {
      setBusy(false)
    }
  }

  if (!ready) {
    return (
      <div style={{ maxWidth: 420, margin: '40px auto', padding: '0 16px' }}>
        読み込み中...
      </div>
    )
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
      <h1 style={{ marginBottom: 12 }}>新しいパスワードを設定</h1>

      <p style={{ color: '#6b7280', lineHeight: 1.7, marginBottom: 16 }}>
        メールのリンクからアクセスした場合、この画面で新しいパスワードを設定できます。
      </p>

      <div style={{ display: 'grid', gap: 10 }}>
        <input
          placeholder="新しいパスワード"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: '100%', padding: 10 }}
        />

        <input
          placeholder="新しいパスワード（確認）"
          type="password"
          value={password2}
          onChange={(e) => setPassword2(e.target.value)}
          style={{ width: '100%', padding: 10 }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onUpdate()
          }}
        />

        <button
          onClick={onUpdate}
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
          {busy ? 'Updating...' : 'パスワードを更新'}
        </button>
      </div>

      {msg && <p style={{ color: 'green', marginTop: 12 }}>{msg}</p>}
      {err && <p style={{ color: 'crimson', marginTop: 12 }}>{err}</p>}
    </div>
  )
}