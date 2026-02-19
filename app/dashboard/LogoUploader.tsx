'use client'

import { useState } from 'react'

export default function LogoUploader({ orgId }: { orgId: string }) {
  const [msg, setMsg] = useState<string>('')

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setMsg('')
    const file = e.target.files?.[0]
    if (!file) return

    const fd = new FormData()
    fd.append('file', file)

    const res = await fetch(`/api/branding/logo`, {
      method: 'POST',
      credentials: 'include',
      body: fd,
    })

    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      setMsg(`失敗: HTTP ${res.status}: ${json.error ?? 'error'}`)
      return
    }

    setMsg('アップロードOK（固定パスに保存されました）')
  }

  return (
    <div style={{ padding: 12, border: '1px solid #ddd', borderRadius: 8 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>ロゴアップロード</div>
      <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onPick} />
      {msg && <div style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{msg}</div>}
      <div style={{ marginTop: 8, color: '#666', fontSize: 12 }}>
        保存先（固定）: <code>branding / orgs/{orgId}/branding/logo</code>
      </div>
    </div>
  )
}
