'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

const reportClientError = (label: string, detail?: any) => {
  if (process.env.NODE_ENV !== 'production') {
    console.error(label, detail)
  } else {
    console.error(label)
  }
}

export default function DocumentActions({
  documentId,
  status,
  documentNo,
}: {
  documentId: string
  status: string
  documentNo?: string | null
}) {
  const router = useRouter()

  const [optimisticStatus, setOptimisticStatus] = useState<string | null>(null)
  const statusShown = optimisticStatus ?? status

  const isDraft = statusShown === 'draft'
  const canSavePdf = statusShown === 'draft' || statusShown === 'issued'

  const [issuedNo, setIssuedNo] = useState<string | null>(null)
  const documentNoShown = issuedNo ?? documentNo ?? null
  const [okMsg, setOkMsg] = useState<string | null>(null)

  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [finalizeStep, setFinalizeStep] = useState<'idle' | 'issuing' | 'saving'>('idle')

  const isBusy = busy !== null || finalizeStep !== 'idle'
  const busyRef = useRef(false)

  const runOnce = async (name: string, fn: () => Promise<void>) => {
    if (busyRef.current) return
    if (isBusy) return

    busyRef.current = true
    setErr(null)
    setOkMsg(null)
    setBusy(name)
    try {
      await fn()
    } finally {
      setBusy(null)
      busyRef.current = false
    }
  }

  const HASH_KEY = useMemo(() => `invoice:doc:${documentId}:items_hash`, [documentId])
  const DIRTY_KEY = useMemo(() => `invoice:doc:${documentId}:items_dirty`, [documentId])
  const [dirtyItems, setDirtyItems] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const read = () => {
      try {
        const v = window.localStorage.getItem(DIRTY_KEY)
        if (v == null) {
          window.localStorage.setItem(DIRTY_KEY, '0')
          setDirtyItems(false)
          return
        }
        setDirtyItems(v === '1')
      } catch {
        setDirtyItems(false)
      }
    }

    read()

    const onStorage = (e: StorageEvent) => {
      if (e.key === DIRTY_KEY) read()
    }
    window.addEventListener('storage', onStorage)

    const t = window.setInterval(read, 800)

    return () => {
      window.removeEventListener('storage', onStorage)
      window.clearInterval(t)
    }
  }, [DIRTY_KEY])

  useEffect(() => {
    if (optimisticStatus && status === optimisticStatus) setOptimisticStatus(null)
  }, [status, optimisticStatus])

  const getItemsHashOrWarn = () => {
    if (typeof window === 'undefined') return null
    try {
      const h = localStorage.getItem(HASH_KEY)
      if (h && h.length > 10) return h
    } catch {}
    setErr('明細ハッシュが見つかりません。編集画面で保存し直してください。')
    return null
  }

  const describeApiError = (action: string, res: Response, json: any) => {
    const code = String(json?.error ?? json?.code ?? '')
    const msg = String(json?.message ?? '')

    if (res.status === 428) {
      return `${action}できません：明細の保存が必要です。\n編集画面で「保存」→戻って再実行してください。`
    }
    if (res.status === 409 && code === 'items_not_saved') {
      return `${action}できません：未保存の明細があります。\n編集画面で「保存」してから再実行してください。`
    }
    if (res.status === 401) return `${action}できません：ログインが必要です。`
    if (res.status === 403) return `${action}できません：権限がありません。`

    if (res.status === 409) {
      return msg || `${action}できません：状態が競合しています（すでに処理済みの可能性）。`
    }

    if (res.status >= 500) {
      return `${action}に失敗しました：サーバエラーです。時間を置いて再試行してください。`
    }

    return `${action}に失敗しました：HTTP ${res.status}: ${code || 'error'}${msg ? `\n${msg}` : ''}`
  }

  const logApiError = (action: string, res: Response, json: any) => {
    try {
      reportClientError(`[${action}] HTTP ${res.status}`, json)
    } catch {}
  }

  const ensureSavedOrWarn = () => {
    if (!dirtyItems) return true
    setErr('明細が未保存です。編集画面で「保存」してから実行してください。')
    return false
  }

  const disableFinalize = !!busy || dirtyItems

  const getItemsHashOrFetch = async () => {
    if (typeof window === 'undefined') return null

    const hashKey = `invoice:doc:${documentId}:items_hash`
    const dirtyKey = `invoice:doc:${documentId}:items_dirty`

    try {
      const res = await fetch('/api/documents/' + documentId + '/items-hash', {
        credentials: 'include',
        cache: 'no-store',
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) return null

      const h = (json?.itemsHash as string | undefined)?.toLowerCase()
      if (!h) return null

      window.localStorage.setItem(hashKey, h)

      if (window.localStorage.getItem(dirtyKey) !== '1') {
        window.localStorage.setItem(dirtyKey, '0')
      }

      return h
    } catch {
      return null
    }
  }

  function friendlyFinalizeError(status: number, body: any) {
    const msg = String(body?.message ?? '').trim()
    if (msg) return msg

    const err = String(body?.error ?? '').trim()
    const detail = body?.detail ?? body
    const detailError = String(detail?.error ?? '').trim()

    const itemsNotSaved =
      err === 'items_not_saved' ||
      detailError === 'items_not_saved' ||
      String(detail?.message ?? '').includes('未保存')

    if (status === 401) return 'ログインが切れました。再ログインしてください。'
    if (status === 428) return '明細の保存状態を確認できません。編集画面で保存してから再実行してください。'
    if (status === 409 && itemsNotSaved) {
      return '明細が未保存です。編集画面で「保存」してから再実行してください。'
    }
    if (status === 409) return err || '競合が発生しました。画面を更新して再実行してください。'
    if (status >= 500) return 'サーバーエラーが発生しました。時間をおいて再実行してください。'

    return err || `エラーが発生しました (HTTP ${status})`
  }

  const toastTimerRef = useRef<number | null>(null)

  function clearToastTimer() {
    if (toastTimerRef.current != null) {
      window.clearTimeout(toastTimerRef.current)
      toastTimerRef.current = null
    }
  }

  function pushOk(message: string, ms = 4000) {
    clearToastTimer()
    setErr(null)
    setOkMsg(message)
    toastTimerRef.current = window.setTimeout(() => setOkMsg(null), ms)
  }

  function pushErr(message: string, ms = 8000) {
    clearToastTimer()
    setOkMsg(null)
    setErr(message)
    toastTimerRef.current = window.setTimeout(() => setErr(null), ms)
  }

  function resetNotice() {
    clearToastTimer()
    setErr(null)
    setOkMsg(null)
  }

  function notifyPdfSaved() {
    if (typeof window === 'undefined') return

    window.dispatchEvent(
      new CustomEvent('invoice:pdf-saved', {
        detail: { documentId },
      })
    )
  }

  const issue = async () => {
    if (!isDraft) return
    if (isBusy) return

    await runOnce('issue', async () => {
      if (!ensureSavedOrWarn()) return

      const itemsHash = await getItemsHashOrFetch()
      if (!itemsHash) {
        setErr('明細ハッシュが見つかりません。編集画面で保存し直してください。')
        return
      }

      const res = await fetch('/api/documents/' + documentId + '/issue', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'x-confirm-saved-items': '1',
          'x-items-hash': itemsHash,
        },
        cache: 'no-store',
      })

      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        logApiError('issue', res, json)
        setErr(describeApiError('発行', res, json))
        return
      }

      const docNo = json?.document?.document_no ?? ''
      setIssuedNo(docNo || null)
      setOkMsg(docNo ? `発行しました：${docNo}` : '発行しました')

      setOptimisticStatus('issued')
      router.refresh()
    })
  }

  const savePdf = async () => {
    if (!canSavePdf) return
    if (isBusy) return

    const popup = window.open('about:blank', '_blank')
    if (popup) {
      try {
        popup.document.title = 'Generating PDF...'
        popup.document.body.innerHTML = '<p style="font-family:sans-serif;">PDFを生成しています…</p>'
      } catch {}
    }

    await runOnce('savePdf', async () => {
      try {
        if (!ensureSavedOrWarn()) {
          if (popup) popup.close()
          return
        }

        const itemsHash = await getItemsHashOrFetch()
        if (!itemsHash) {
          setErr('明細ハッシュが見つかりません。編集画面で保存し直してください。')
          if (popup) popup.close()
          return
        }

        const res = await fetch('/api/documents/' + documentId + '/pdf/save', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'x-confirm-saved-items': '1',
            'x-items-hash': itemsHash,
          },
          cache: 'no-store',
        })

        const json = await res.json().catch(() => ({}))

        if (!res.ok) {
          logApiError('pdf/save', res, json)
          setErr(describeApiError('PDF保存', res, json))
          if (popup) popup.close()
          return
        }

        notifyPdfSaved()
        router.refresh()
        setOkMsg('PDFを保存しました')

        const newFileId =
          (json?.file?.id as string | undefined) ??
          (json?.pdf?.file?.id as string | undefined)

        if (newFileId) {
          const url = `/api/documents/${documentId}/pdf-files/${newFileId}/download`
          if (popup) {
            popup.location.href = url
            popup.focus()
          } else {
            window.open(url, '_blank')
          }
        } else if (popup) {
          popup.close()
        }
      } catch (e: any) {
        setErr('Network/JS error: ' + (e?.message ?? String(e)))
        if (popup) popup.close()
      }
    })
  }

  const duplicateToEdit = async () => {
    setErr(null)
    setBusy('duplicate')

    try {
      const res = await fetch('/api/documents/' + documentId + '/duplicate', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
      })
      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        logApiError('duplicate', res, json)
        setErr(describeApiError('複製', res, json))
        return
      }

      const newId =
        json?.id ??
        json?.document?.id ??
        json?.document_id ??
        json?.document?.document_id

      if (!newId) {
        setErr('duplicate success but new id missing: ' + JSON.stringify(json))
        return
      }

      router.push('/documents/' + newId + '/edit')
      router.refresh()
    } catch (e: any) {
      setErr('Network/JS error: ' + (e?.message ?? String(e)))
    } finally {
      setBusy(null)
    }
  }

  const finalize = async () => {
    if (!isDraft) return
    if (isBusy) return
    resetNotice()

    await runOnce('finalize', async () => {
      try {
        if (!ensureSavedOrWarn()) return

        const itemsHash = await getItemsHashOrFetch()
        if (!itemsHash) {
          pushErr('明細ハッシュが見つかりません。編集画面で保存し直してください。')
          return
        }

        setFinalizeStep('issuing')

        const res = await fetch('/api/documents/' + documentId + '/finalize', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'x-confirm-saved-items': '1',
            'x-items-hash': itemsHash,
          },
          cache: 'no-store',
        })

        const text = await res.clone().text().catch(() => '')
        let json: any = {}
        try {
          json = text ? JSON.parse(text) : {}
        } catch {
          json = { raw: text }
        }

        if (!res.ok) {
          reportClientError('[finalize] raw body (first 400 chars)', text.slice(0, 400))
          logApiError('finalize', res, json)

          const friendly = friendlyFinalizeError(res.status, json)
          pushErr(friendly)
          return
        }

        const issuedDocNo =
          (json?.issue?.document?.document_no as string | undefined) ??
          (json?.issue?.document_no as string | undefined) ??
          (json?.issue?.document?.no as string | undefined) ??
          null

        if (issuedDocNo) {
          setIssuedNo(issuedDocNo)
        }

        setOptimisticStatus('issued')
        setFinalizeStep('saving')

        notifyPdfSaved()
        router.refresh()

        if (issuedDocNo) {
          pushOk(`発行＋PDF保存しました：${issuedDocNo}`)
        } else {
          pushOk('発行＋PDF保存しました')
        }
      } catch (e: any) {
        pushErr('Network/JS error: ' + (e?.message ?? String(e)))
      } finally {
        setFinalizeStep('idle')
      }
    })
  }

  const actionBusy = !!busy || isBusy || finalizeStep !== 'idle'
  const blockedByDirty = !!dirtyItems

  const previewDisabled = !!busy || blockedByDirty
  const refreshDisabled = actionBusy
  const finalizeDisabled = disableFinalize || actionBusy || blockedByDirty
  const issueDisabled = actionBusy || blockedByDirty
  const savePdfDisabled = actionBusy || blockedByDirty
  const duplicateDisabled = actionBusy

  const busyLabel =
    busy === 'finalize'
      ? finalizeStep === 'issuing'
        ? '発行中…'
        : finalizeStep === 'saving'
          ? 'PDF保存中…'
          : '処理中…'
      : busy === 'issue'
        ? '発行中…'
        : busy === 'savePdf'
          ? 'PDF生成中…'
          : busy === 'duplicate'
            ? '複製中…'
            : busy
              ? `処理中… (${busy})`
              : ''

  async function openPdfPreview() {
    const popup = window.open('about:blank', '_blank')
    if (popup) {
      try {
        popup.document.title = 'Loading...'
        popup.document.body.innerHTML = '<p style="font-family:sans-serif;">PDFを生成しています…</p>'
      } catch {}
    }

    try {
      if (!ensureSavedOrWarn()) {
        if (popup) popup.close()
        return
      }

      const res = await fetch(`/api/documents/${documentId}/pdf`, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        let json: any = {}
        try {
          json = text ? JSON.parse(text) : {}
        } catch {
          json = { raw: text }
        }
        const msg = friendlyFinalizeError(res.status, json)
        pushErr(msg)
        if (popup) {
          try {
            popup.document.body.innerHTML =
              `<p style="font-family:sans-serif;color:#b00020">PDFプレビューに失敗しました：${msg}</p>`
          } catch {}
        }
        return
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)

      if (popup) {
        try {
          popup.location.href = url
        } catch {
          window.open(url, '_blank')
        }
      } else {
        window.open(url, '_blank')
      }

      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (e: any) {
      const msg = 'Network/JS error: ' + (e?.message ?? String(e))
      pushErr(msg)
      if (popup) popup.close()
    }
  }

  return (
    <div>
      <h2>操作</h2>

      {busyLabel && (
        <p style={{ margin: '6px 0 10px', color: '#6b7280', fontSize: 13 }}>
          実行中：<b>{busyLabel}</b>
        </p>
      )}

      {dirtyItems && (
        <p style={{ color: '#b45309', marginTop: 0 }}>
          ※ 明細が未保存です。編集画面で「保存」してから発行してください。
        </p>
      )}

      {finalizeStep !== 'idle' && (
        <div
          style={{
            margin: '12px 0',
            padding: '10px 12px',
            border: '1px solid #e5e7eb',
            borderRadius: 10,
            background: '#fafafa',
            color: '#374151',
          }}
        >
          {finalizeStep === 'issuing' && '発行しています…'}
          {finalizeStep === 'saving' && 'PDFを保存しています…'}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {isDraft && (
          <button
            type="button"
            onClick={finalize}
            disabled={finalizeDisabled}
            style={btnPrimaryStyle(finalizeDisabled)}
          >
            {blockedByDirty
              ? '未保存のため発行不可'
              : busy === 'finalize'
                ? finalizeStep === 'issuing'
                  ? '発行中…'
                  : 'PDF保存中…'
                : 'この内容で発行'}
          </button>
        )}

        <button
          type="button"
          onClick={openPdfPreview}
          disabled={previewDisabled}
          style={btnStyle(previewDisabled)}
        >
          PDFプレビュー
        </button>

        {!isDraft && (
          <button
            type="button"
            onClick={duplicateToEdit}
            disabled={duplicateDisabled}
            style={btnStyle(duplicateDisabled)}
          >
            {busy === 'duplicate' ? '複製中…' : '複製して編集'}
          </button>
        )}
      </div>

      {!isDraft && (
        <p style={{ color: '#666' }}>
          この書類は <b>{status}</b> です。修正・再発行は「複製して編集（下書き作成）」を使ってください。
        </p>
      )}

      <div
        style={{
          position: 'fixed',
          top: 16,
          right: 16,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          maxWidth: 420,
        }}
      >
        {err && (
          <div
            style={{
              border: '1px solid #fecaca',
              background: '#fff1f2',
              color: '#991b1b',
              borderRadius: 10,
              padding: '10px 12px',
              boxShadow: '0 6px 18px rgba(0,0,0,0.10)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ fontWeight: 700 }}>エラー</div>
              <button
                onClick={() => setErr(null)}
                aria-label="エラーを閉じる"
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: '#991b1b',
                  fontSize: 16,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
            <div style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{err}</div>
          </div>
        )}

        {okMsg && (
          <div
            style={{
              border: '1px solid #bbf7d0',
              background: '#f0fdf4',
              color: '#166534',
              borderRadius: 10,
              padding: '10px 12px',
              boxShadow: '0 6px 18px rgba(0,0,0,0.10)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ fontWeight: 700 }}>完了</div>
              <button
                onClick={() => setOkMsg(null)}
                aria-label="完了メッセージを閉じる"
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: '#166534',
                  fontSize: 16,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
            <div style={{ marginTop: 6 }}>{okMsg}</div>
          </div>
        )}
      </div>

      {documentNoShown && (
        <p style={{ color: '#555' }}>
          発行番号: <b>{documentNoShown}</b>
        </p>
      )}

      {busy && <p style={{ color: '#555' }}>処理状態: {busy}</p>}
    </div>
  )
}

const btnBase: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 10,
  border: '1px solid #ddd',
  background: '#fff',
  cursor: 'pointer',
  fontFamily: 'inherit',
}

function btnStyle(disabled: boolean): React.CSSProperties {
  if (!disabled) return btnBase
  return {
    ...btnBase,
    opacity: 0.55,
    cursor: 'not-allowed',
    pointerEvents: 'none',
  }
}

const btnPrimaryBase: React.CSSProperties = {
  ...btnBase,
  padding: '10px 16px',
  border: '1px solid #111827',
  background: '#111827',
  color: '#fff',
  fontWeight: 700,
  boxShadow: '0 8px 20px rgba(17, 24, 39, 0.18)',
}

function btnPrimaryStyle(disabled: boolean): React.CSSProperties {
  if (!disabled) return btnPrimaryBase
  return {
    ...btnPrimaryBase,
    opacity: 0.55,
    cursor: 'not-allowed',
    pointerEvents: 'none',
    boxShadow: 'none',
  }
}