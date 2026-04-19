'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/browser'

type BusyMode = 'login' | 'signup' | null
type TemplateProfile = 'standard' | 'creator' | 'interior'

function isValidEmail(email: string) {
  return /\S+@\S+\.\S+/.test(email)
}

function normalizeTemplateProfile(value: string | null | undefined): TemplateProfile {
  const s = String(value ?? '').trim()
  if (s === 'creator' || s === 'interior' || s === 'standard') return s
  return 'standard'
}

function nonEmpty(value: string | null | undefined) {
  const s = String(value ?? '').trim()
  return s ? s : ''
}

function setCookie(name: string, value: string) {
  if (typeof document === 'undefined') return
  const secure =
    typeof window !== 'undefined' && window.location.protocol === 'https:'
      ? '; Secure'
      : ''
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; SameSite=Lax${secure}`
}

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState<BusyMode>(null)

  useEffect(() => {
    const rawEntry = searchParams.get('entry')
    if (!rawEntry) return

    const entry = normalizeTemplateProfile(rawEntry)
    const entryPath =
      nonEmpty(searchParams.get('entry_path')) ||
      (entry === 'creator'
        ? '/freelance'
        : entry === 'interior'
          ? '/interior'
          : '/small-business')
    const entrySource = nonEmpty(searchParams.get('entry_source')) || 'direct'

    setCookie('sn_entry_profile', entry)
    setCookie('sn_entry_path', entryPath)
    setCookie('sn_entry_source', entrySource)
  }, [searchParams])

  const validate = () => {
    const normalizedEmail = email.trim()

    if (!normalizedEmail) {
      setMsg('メールアドレスを入力してください。')
      return false
    }

    if (!isValidEmail(normalizedEmail)) {
      setMsg('メールアドレスの形式が正しくありません。')
      return false
    }

    if (!password) {
      setMsg('パスワードを入力してください。')
      return false
    }

    if (password.length < 8) {
      setMsg('パスワードは8文字以上で入力してください。')
      return false
    }

    return true
  }

  const ensureProfile = async () => {
    const res = await fetch('/api/me/ensure-profile', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'content-type': 'application/json',
      },
      cache: 'no-store',
    })

    if (!res.ok) {
      let message = 'プロフィール初期化に失敗しました。'
      try {
        const json = await res.json()
        message = String(json?.message ?? json?.error ?? message)
      } catch {
        // noop
      }
      throw new Error(message)
    }
  }

  const getFriendlyErrorMessage = (raw: string, mode: 'login' | 'signup') => {
    const message = String(raw || '').toLowerCase()

    if (mode === 'login') {
      if (message.includes('invalid login credentials')) {
        return 'メールアドレスまたはパスワードが正しくありません。'
      }
      return raw || 'ログインに失敗しました。'
    }

    if (
      message.includes('user already registered') ||
      message.includes('already been registered')
    ) {
      return 'このメールアドレスは既に登録されています。ログインをお試しください。'
    }

    if (message.includes('password')) {
      return 'パスワードの条件を満たしていません。8文字以上で入力してください。'
    }

    return raw || '新規登録に失敗しました。'
  }

  const onLogin = async () => {
    if (busy) return
    setMsg(null)

    if (!validate()) return

    setBusy('login')

    try {
      const normalizedEmail = email.trim()

      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      })

      if (error) {
        setMsg(getFriendlyErrorMessage(error.message, 'login'))
        return
      }

      await ensureProfile()

      router.push('/documents')
      router.refresh()
    } catch (e: any) {
      setMsg(String(e?.message ?? 'ログインに失敗しました。'))
    } finally {
      setBusy(null)
    }
  }

  const onSignup = async () => {
    if (busy) return
    setMsg(null)

    if (!validate()) return

    setBusy('signup')

    try {
      const normalizedEmail = email.trim()

      const { error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
      })

      if (signUpError) {
        setMsg(getFriendlyErrorMessage(signUpError.message, 'signup'))
        return
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      })

      if (signInError) {
        setMsg(getFriendlyErrorMessage(signInError.message, 'login'))
        return
      }

      await ensureProfile()

      router.push('/documents')
      router.refresh()
    } catch (e: any) {
      setMsg(String(e?.message ?? '新規登録に失敗しました。'))
    } finally {
      setBusy(null)
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
      <h1 style={{ marginBottom: 12 }}>ログイン</h1>

      <p
        style={{
          marginTop: 0,
          marginBottom: 16,
          fontSize: 14,
          lineHeight: 1.7,
          color: '#4b5563',
        }}
      >
        新規ユーザーの方は、メールアドレスとパスワードを入力して
        「新規登録」を押してください。登録後、そのままアプリに移動できます。
      </p>

      <div style={{ display: 'grid', gap: 10 }}>
        <input
          placeholder="メールアドレス"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: '100%', padding: 10 }}
          autoComplete="email"
        />

        <input
          placeholder="パスワード（8文字以上）"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: '100%', padding: 10 }}
          autoComplete="current-password"
          onKeyDown={(e) => {
            if (e.key === 'Enter') onLogin()
          }}
        />

        <button
          onClick={onLogin}
          disabled={!!busy}
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
          {busy === 'login' ? 'ログイン中...' : 'ログイン'}
        </button>

        <button
          onClick={onSignup}
          disabled={!!busy}
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            border: '1px solid #d1d5db',
            background: '#fff',
            color: '#111827',
            fontWeight: 700,
            cursor: busy ? 'default' : 'pointer',
          }}
        >
          {busy === 'signup' ? '登録中...' : '新規登録'}
        </button>
      </div>

      <div style={{ marginTop: 12 }}>
        <Link
          href="/forgot-password"
          style={{
            fontSize: 14,
            color: '#2563eb',
            textDecoration: 'none',
          }}
        >
          パスワードをお忘れですか？
        </Link>
      </div>

      {msg && <p style={{ color: 'crimson', marginTop: 12 }}>{msg}</p>}
    </div>
  )
}