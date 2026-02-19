'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, useRef } from 'react'

type State =
  | { loading: true }
  | {
      loading: false
      imageUrl: string | null
      path: string | null
      mime: string | null
    }

export default function BrandingSettings() {
  const router = useRouter()
  const [state, setState] = useState<State>({ loading: true })
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const load = async () => {
    setErr(null)
    setState({ loading: true })
    const res = await fetch('/api/user-settings/branding/logo', { cache: 'no-store' })
    if (res.status === 401) {
      router.push('/login')
      return
    }
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      setState({ loading: false, imageUrl: null, path: null, mime: null })
      setErr(`HTTP ${res.status}: ${json.error ?? 'error'}`)
      return
    }
    const logo = json.logo ?? null

      setState({
        loading: false,
        imageUrl: logo?.path ? '/api/user-settings/branding/logo/image' : null,
        path: logo?.path ?? null,
        mime: logo?.mime ?? null,
      })

  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onPick = async (file: File | null) => {
    if (!file) return
    setErr(null)
    setBusy('uploading')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/user-settings/branding/logo', { method: 'POST', body: fd })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErr(`HTTP ${res.status}: ${json.error ?? 'upload failed'}`)
        return
      }
      // ロゴ情報を取り直す（キャッシュ回避）
      await load()
    } finally {
      setBusy(null)
    }
  }

  const onDelete = async () => {
    setErr(null)
    setBusy('deleting')
    try {
      const res = await fetch('/api/user-settings/branding/logo', { method: 'DELETE' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErr(`HTTP ${res.status}: ${json.error ?? 'delete failed'}`)
        return
      }
      await load()
    } finally {
      setBusy(null)
    }
  }

  const [pickedFile, setPickedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handlePick = async (file: File | null) => {
    setPickedFile(file)
    if (!file) return

    try {
      await onPick(file)
    } finally {
      // 同じファイルをもう一度選んでも onChange が発火するようにクリア
      if (fileInputRef.current) fileInputRef.current.value = ''
      setPickedFile(null)
    }
  }

const imageUrl = state.loading ? null : state.imageUrl

const imgSrc = useMemo(() => {
  if (!imageUrl) return null
  const sep = imageUrl.includes('?') ? '&' : '?'
  return `${imageUrl}${sep}t=${Date.now()}`
}, [imageUrl])

  return (
    <section style={{ maxWidth: 720 }}>
      {err && (
        <div style={{ padding: 12, background: '#fee2e2', borderRadius: 8, marginBottom: 12 }}>
          {err}
        </div>
      )}

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div style={{ width: 260 }}>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>Current logo</div>
          <div
            style={{
              width: 260,
              height: 120,
              border: '1px solid #ddd',
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#fff',
              overflow: 'hidden',
            }}
          >
            {state.loading ? (
              <span style={{ fontSize: 12, color: '#666' }}>Loading...</span>
            ) : imgSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imgSrc} alt="logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            ) : (
              <span style={{ fontSize: 12, color: '#666' }}>No logo</span>
            )}
          </div>
          {!state.loading && state.path && (
            <div style={{ marginTop: 8, fontSize: 12, color: '#444' }}>
              <div>mime: {state.mime ?? '-'}</div>
              <div style={{ wordBreak: 'break-all' }}>path: {state.path}</div>
            </div>
          )}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>Upload / Replace</div>

                    {/* ✅ inputは非表示。ボタン風labelでファイル選択 */}
          <input
            ref={fileInputRef}
            id="logo-file"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={!!busy}
            onChange={(e) => handlePick(e.target.files?.[0] ?? null)}
            style={{ display: 'none' }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <label
              htmlFor="logo-file"             
              style={{
                padding: '10px 14px',
                borderRadius: 10,
                border: '1px solid #ddd',
                background: busy ? '#f3f4f6' : '#fff',
                cursor: busy ? 'not-allowed' : 'pointer',
                pointerEvents: busy ? 'none' : 'auto',
                fontSize: 14,
                fontWeight: 600,
                userSelect: 'none',
                opacity: busy ? 0.6 : 1,
              }}
            >
              ロゴ画像を選択
            </label>

            <span style={{ fontSize: 12, color: '#666' }}>
              {pickedFile ? pickedFile.name : 'ファイルが選択されていません'}
            </span>
          </div>

          <div style={{ marginTop: 10, fontSize: 12, color: '#666' }}>
            対応: PNG/JPEG/WEBP（最大2MB）
          </div>

          <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            <button
              onClick={load}
              disabled={!!busy}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', background: '#fff' }}
            >
              Reload
            </button>

            <button
              onClick={onDelete}
              disabled={!!busy || (state.loading ? true : !state.path)}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid #ddd',
                background: '#fff',
              }}
            >
              Delete
            </button>

            {busy && <span style={{ fontSize: 12, color: '#666' }}>{busy}...</span>}
          </div>
        </div>
      </div>
    </section>
  )
}
