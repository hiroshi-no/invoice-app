'use client'

import { useEffect, useMemo, useState, useRef } from 'react'

type LogoInfo = { path: string; mime: string | null } | null

export default function LogoUploader({ orgId }: { orgId: string }) {
  const [msg, setMsg] = useState<string>('')
  const [busy, setBusy] = useState<string | null>(null)
  const [logo, setLogo] = useState<LogoInfo>(null)
  const [imgRev, setImgRev] = useState<number>(0)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const load = async () => {
    setMsg('')
    setBusy('loading')
    try {
      const res = await fetch('/api/user-settings/branding/logo', {
        credentials: 'include',
        cache: 'no-store',
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setLogo(null)
        setMsg(`失敗: HTTP ${res.status}: ${json.error ?? 'error'}`)
        return
      }
      setLogo(json.logo ?? null)
      setImgRev(Date.now())
    } finally {
      setBusy(null)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const imgSrc = useMemo(() => {
    if (!logo?.path) return null
    return `/api/user-settings/branding/logo/image?t=${imgRev}`
  }, [logo, imgRev])

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setMsg('')
    const file = e.target.files?.[0]
    if (!file) return

    setBusy('uploading')
    try {
      const fd = new FormData()
      fd.append('file', file)

      const res = await fetch('/api/user-settings/branding/logo', {
        method: 'POST',
        credentials: 'include',
        body: fd,
      })

      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMsg(`失敗: HTTP ${res.status}: ${json.error ?? 'error'}`)
        return
      }

      setMsg('アップロードOK')
      await load()
    } finally {
      setBusy(null)
      // 同じファイルを連続で選んでも onChange が発火するようにクリア
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const onDelete = async () => {
    setMsg('')
    setBusy('deleting')
    try {
      const res = await fetch('/api/user-settings/branding/logo', {
        method: 'DELETE',
        credentials: 'include',
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMsg(`失敗: HTTP ${res.status}: ${json.error ?? 'error'}`)
        return
      }
      setMsg('削除OK')
      await load()
    } finally {
      setBusy(null)
    }
  }

  return (
    <div style={{ padding: 12, border: '1px solid #ddd', borderRadius: 8 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>ロゴアップロード（org共通）</div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
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
            {busy === 'loading' ? (
              <span style={{ fontSize: 12, color: '#666' }}>Loading...</span>
            ) : imgSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imgSrc} alt="logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            ) : (
              <span style={{ fontSize: 12, color: '#666' }}>No logo</span>
            )}
          </div>

          {logo?.path && (
            <div style={{ marginTop: 8, fontSize: 12, color: '#444' }}>
              <div>mime: {logo.mime ?? '-'}</div>
              <div style={{ wordBreak: 'break-all' }}>path: {logo.path}</div>
            </div>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 260 }}>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={!!busy}
            onChange={onPick}
          />

          <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={load}
              disabled={!!busy}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', background: '#fff' }}
            >
              Reload
            </button>

            <button
              onClick={onDelete}
              disabled={!!busy || !logo?.path}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', background: '#fff' }}
            >
              Delete
            </button>

            {busy && <span style={{ fontSize: 12, color: '#666' }}>{busy}...</span>}
          </div>

          {msg && <div style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{msg}</div>}

          <div style={{ marginTop: 8, color: '#666', fontSize: 12 }}>
            保存先（bucket=branding / key）:{' '}
            <code>{logo?.path ?? `${orgId}/logo.(png|jpg|webp)`}</code>
          </div>
        </div>
      </div>
    </div>
  )
}