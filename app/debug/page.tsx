'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/browser'

export default function DebugPage() {
  const router = useRouter()
  const supabase = createClient()

  const [text, setText] = useState('loading...')
  const [docId, setDocId] = useState('')
  const [result, setResult] = useState<any>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data, error }) => {
      if (error) return setText('error: ' + error.message)
      if (!data.user) return setText('not logged in')
      setText(data.user.id + ' (' + (data.user.email ?? '') + ')')
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // ✅ 本番と同じ headers を付けるために items_hash を読む
  const getItemsHashOrWarn = () => {
    if (!docId) {
      setErr('documents.id（UUID）を入力してください')
      return null
    }
    const key = `invoice:doc:${docId}:items_hash`
    const v = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null
    if (!v) {
      setErr(`items_hash が localStorage にありません。\nKey=${key}\n先に明細を保存して items_hash を生成してください。`)
      return null
    }
    return v
  }

  const issue = async () => {
    setErr(null)
    setResult(null)

    if (!docId) {
      setErr('documents.id（UUID）を入力してください')
      return
    }

    const itemsHash = getItemsHashOrWarn()
    if (!itemsHash) return

    const res = await fetch('/api/documents/' + docId + '/issue', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'x-confirm-saved-items': '1',
        'x-items-hash': itemsHash,
      },
    })

    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      setErr('HTTP ' + res.status + ': ' + (json.error ?? 'error'))
      setResult(json)
      return
    }

    setResult(json)
  }

  const savePdf = async () => {
    setErr(null)
    setResult(null)

    if (!docId) {
      setErr('documents.id（UUID）を入力してください')
      return
    }

    const itemsHash = getItemsHashOrWarn()
    if (!itemsHash) return

    const res = await fetch('/api/documents/' + docId + '/pdf/save', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'x-confirm-saved-items': '1',
        'x-items-hash': itemsHash,
      },
    })

    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      setErr('HTTP ' + res.status + ': ' + (json.error ?? 'error'))
      setResult(json)
      return
    }

    setResult(json)
  }

  const listFiles = async () => {
    setErr(null)
    setResult(null)

    if (!docId) {
      setErr('documents.id（UUID）を入力してください')
      return
    }

    const res = await fetch('/api/documents/' + docId + '/pdf-files', {
      method: 'GET',
      credentials: 'include',
    })

    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      setErr('HTTP ' + res.status + ': ' + (json.error ?? 'error'))
      setResult(json)
      return
    }

    setResult(json)
  }

  // ✅ 正ルートを直接開く（302→signedUrl→200）
  const downloadFirst = () => {
    setErr(null)

    const files = result?.files
    if (!files || files.length === 0) {
      setErr('先に「履歴取得」を押して files を取得してください')
      return
    }
    if (!docId) {
      setErr('documents.id（UUID）を入力してください')
      return
    }

    const fileId = files[0].id as string
    const url = `/api/documents/${docId}/pdf-files/${fileId}/download`
    window.open(url, '_blank')
  }

  return (
    <div style={{ maxWidth: 820, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <h1>Debug</h1>

      <div style={{ padding: 12, border: '1px solid #ddd', borderRadius: 8 }}>
        <p>
          User: <b>{text}</b>
        </p>
        <button onClick={signOut} style={{ padding: '8px 12px' }}>
          Sign out
        </button>
      </div>

      <hr style={{ margin: '20px 0' }} />

      <h2>Issue / PDF 保存 テスト</h2>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          value={docId}
          onChange={(e) => setDocId(e.target.value)}
          placeholder="documents.id (UUID)"
          style={{ flex: 1, padding: 8, border: '1px solid #ccc' }}
        />
        <button onClick={issue} style={{ padding: '8px 12px' }}>
          Issue 実行
        </button>
        <button onClick={savePdf} style={{ padding: '8px 12px' }}>
          PDF 保存
        </button>
        <button onClick={listFiles} style={{ padding: '8px 12px' }}>
          履歴取得
        </button>
        <button onClick={downloadFirst} style={{ padding: '8px 12px' }}>
          最新PDFを開く
        </button>
      </div>

      {err && <p style={{ color: 'crimson', whiteSpace: 'pre-wrap' }}>{err}</p>}

      {result && (
        <pre style={{ marginTop: 12, padding: 12, background: '#f7f7f7', borderRadius: 8, overflowX: 'auto' }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  )
}
