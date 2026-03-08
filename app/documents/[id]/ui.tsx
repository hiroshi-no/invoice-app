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

type PdfFile = {
  id: string
  created_at: string
  path: string
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

  // ✅ props status に optimistic をかぶせる（Issue直後にUIが戻らない）
  const [optimisticStatus, setOptimisticStatus] = useState<string | null>(null)
  const statusShown = optimisticStatus ?? status

  const isDraft = statusShown === 'draft'
  const canSavePdf = statusShown === 'draft' || statusShown === 'issued'

  const [issuedNo, setIssuedNo] = useState<string | null>(null)
  const documentNoShown = issuedNo ?? documentNo ?? null
  const [okMsg, setOkMsg] = useState<string | null>(null)

  const [files, setFiles] = useState<PdfFile[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [finalizeStep, setFinalizeStep] = useState<'idle' | 'issuing' | 'saving'>('idle')

  const isBusy = busy !== null || finalizeStep !== 'idle'
  const busyRef = useRef(false)

// ✅ 連打/多重実行を防ぐ共通ラッパー（refロックで確実に止める）
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

const formatJst = (iso: string) => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

// ✅ ダウンロードURL（正ルート）を作る
const getDownloadPath = (fileId: string) => `/api/documents/${documentId}/pdf-files/${fileId}/download`

// ✅ URL を「絶対URL」でコピーしたい場合用
const toAbsoluteUrl = (path: string) => {
  if (typeof window === 'undefined') return path
  const p = path.startsWith('/') ? path : '/' + path
  return new URL(p, window.location.origin).toString()
}

// ✅ クリップボードコピー（失敗時は fallback）
const copyText = async (text: string) => {
  try {
    // navigator.clipboard は https or localhost なら基本OK
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // fallback（古いブラウザ対策）
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.left = '-9999px'
      ta.style.top = '-9999px'
      document.body.appendChild(ta)
      ta.focus()
      ta.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      return ok
    } catch {
      return false
    }
  }
}

// ✅ コピー成功メッセージ（トースト）
const [copyMsg, setCopyMsg] = useState<string | null>(null)
const copyTimerRef = useRef<number | null>(null)

const showCopied = (msg: string) => {
  if (copyTimerRef.current != null) {
    window.clearTimeout(copyTimerRef.current)
    copyTimerRef.current = null
  }
  setCopyMsg(msg)
  copyTimerRef.current = window.setTimeout(() => {
    setCopyMsg(null)
    copyTimerRef.current = null
  }, 1600)
}

const fromNow = (iso: string) => {
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return ''
  const diffSec = Math.floor((Date.now() - t) / 1000)
  if (diffSec < 10) return 'たった今'
  if (diffSec < 60) return `${diffSec}秒前`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}分前`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}時間前`
  const diffDay = Math.floor(diffHr / 24)
  return `${diffDay}日前`
}

const fileNameFromPath = (path: string) => {
  const p = String(path ?? '')
  const name = p.split('/').pop() ?? p
  return name || p
}
  // --- ここから下は既存の HASH_KEY / DIRTY_KEY / loadFiles 等を続ける ---
  const HASH_KEY = useMemo(() => `invoice:doc:${documentId}:items_hash`, [documentId])

    // ✅ items 未保存フラグキー
  const DIRTY_KEY = useMemo(() => `invoice:doc:${documentId}:items_dirty`, [documentId])
  const [dirtyItems, setDirtyItems] = useState(false)

  // ✅ localStorage を読んで dirtyItems に反映（未初期化なら 0 を入れる）
  useEffect(() => {
    if (typeof window === 'undefined') return

    const read = () => {
      try {
        const v = window.localStorage.getItem(DIRTY_KEY)
        if (v == null) {
          window.localStorage.setItem(DIRTY_KEY, '0') // ✅ dirty=null 対策
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

    // ✅ 同一タブ内での更新検知用（storageイベントは別タブ向けなので）
    const t = window.setInterval(read, 800)

    return () => {
      window.removeEventListener('storage', onStorage)
      window.clearInterval(t)
    }
  }, [DIRTY_KEY])


  // ✅ サーバ側が追いついたら optimistic を外す
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

// ✅ APIエラーをユーザー向けに整形（428/409中心に統一）
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

// ✅ 失敗時ログ（デバッグ用）
const logApiError = (action: string, res: Response, json: any) => {
  try {
    reportClientError(`[${action}] HTTP ${res.status}`, json)
  } catch {}
}


useEffect(() => {
  if (typeof window === 'undefined') return

  const read = () => {
    try {
      const v = window.localStorage.getItem(DIRTY_KEY)
      if (v == null) {
        window.localStorage.setItem(DIRTY_KEY, '0') // ✅ 未初期化対策
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

  // ✅ interval は任意（残してOK。消してもOK）
  const t = window.setInterval(read, 800)

  return () => {
    window.removeEventListener('storage', onStorage)
    window.clearInterval(t)
  }
}, [DIRTY_KEY])


const loadFiles = async (opts?: { silent?: boolean }) => {
  setErr(null)
  if (!opts?.silent) setBusy('loading')

  try {
    const res = await fetch('/api/documents/' + documentId + '/pdf-files', {
      credentials: 'include',
      cache: 'no-store',
    })
    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      logApiError('pdf-files', res, json)
      setErr(describeApiError('履歴取得', res, json))
      return
    }

    const list = (json.files ?? []) as PdfFile[]
    list.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    setFiles(list)
  } catch (e: any) {
    setErr('Network/JS error: ' + (e?.message ?? String(e)))
  } finally {
    if (!opts?.silent) setBusy(null)
  }
}

// ✅ 未保存ガード（dirtyItems state を参照）
const ensureSavedOrWarn = () => {
  if (!dirtyItems) return true
  setErr('明細が未保存です。編集画面で「保存」してから実行してください。')
  return false
}

// ✅ 未保存なら発行系を無効化
const disableFinalize = !!busy || dirtyItems

  useEffect(() => {
    loadFiles()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId])

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

    // ✅ 発行番号を表示
    const docNo = json?.document?.document_no ?? ''
    setIssuedNo(docNo || null)
    setOkMsg(docNo ? `発行しました：${docNo}` : '発行しました')

    // ✅ issued 扱いに固定
    setOptimisticStatus('issued')

    router.refresh()
  })
}

const openFile = (fileId: string, opts?: { target?: Window | null }) => {
  // ✅ ここは必ず helper 経由（/download 抜け防止）
  const url = getDownloadPath(fileId)

  const target = opts?.target ?? window.open('about:blank', '_blank')
  if (target) {
    target.location.href = url
    target.focus()
  } else {
    window.open(url, '_blank')
  }
}


const savePdf = async () => {
  if (!canSavePdf) return
  if (isBusy) return

  // ✅ ポップアップは await 前に開く（ブロック回避）
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

      // ✅ 履歴更新
      await loadFiles({ silent: true })
      router.refresh()

      setOkMsg('PDFを保存しました（履歴に追加しました）')

      const newFileId =
        (json?.file?.id as string | undefined) ??
        (json?.pdf?.file?.id as string | undefined)

      if (newFileId) {
        openFile(newFileId, { target: popup })
      } else {
        if (popup) popup.close()
      }
    } catch (e: any) {
      setErr('Network/JS error: ' + (e?.message ?? String(e)))
      if (popup) popup.close()
    }
  })
}


const onOpenClick = (fileId: string) => {
  setErr(null)

  const popup = window.open('about:blank', '_blank')
  if (popup) {
    try {
      popup.document.title = 'Opening PDF...'
      popup.document.body.innerHTML = '<p style="font-family:sans-serif;">開いています…</p>'
    } catch {}
  }

  openFile(fileId, { target: popup })
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

const getItemsHashOrFetch = async () => {
  if (typeof window === 'undefined') return null

  const hashKey = `invoice:doc:${documentId}:items_hash`
  const dirtyKey = `invoice:doc:${documentId}:items_dirty`

  try {
    // ✅ 毎回サーバから最新hashを取る（localStorageの古い値を信用しない）
    const res = await fetch('/api/documents/' + documentId + '/items-hash', {
      credentials: 'include',
      cache: 'no-store',
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) return null

    const h = (json?.itemsHash as string | undefined)?.toLowerCase()
    if (!h) return null

    // ✅ 最新を保存（以後の画面でも安定）
    window.localStorage.setItem(hashKey, h)

    // dirty が '1' でなければ 0 に揃える（'1' は保持）
    if (window.localStorage.getItem(dirtyKey) !== '1') window.localStorage.setItem(dirtyKey, '0')

    return h
  } catch {
    return null
  }
}


function friendlyFinalizeError(status: number, body: any) {
  // ✅ 最優先：サーバが整形して返した message
  const msg = String(body?.message ?? '').trim()
  if (msg) return msg

  // フォールバック：error / detail.error などを見る（古いレスポンス互換）
  const err = String(body?.error ?? '').trim()

  const detail = body?.detail ?? body
  const detailError = String(detail?.error ?? '').trim()

  const itemsNotSaved =
    err === 'items_not_saved' ||
    detailError === 'items_not_saved' ||
    String(detail?.message ?? '').includes('未保存')

  if (status === 401) return 'ログインが切れました。再ログインしてください。'
  if (status === 428) return '明細の保存状態を確認できません。編集画面で保存してから再実行してください。'
  if (status === 409 && itemsNotSaved) return '明細が未保存です。編集画面で「保存」してから再実行してください。'
  if (status === 409) return err || '競合が発生しました。画面を更新して再実行してください。'
  if (status >= 500) return 'サーバーエラーが発生しました。時間をおいて再実行してください。'

  return err || `エラーが発生しました (HTTP ${status})`
}

function setPopupMessage(popup: Window | null, html: string) {
  if (!popup) return
  try {
    popup.document.body.innerHTML = html
  } catch {}
}

// --- toast helpers（OK/ERRを統一して自動クリア） ---
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

// runOnce開始前に呼ぶ（前回の通知を消す）
function resetNotice() {
  clearToastTimer()
  setErr(null)
  setOkMsg(null)
}

const finalize = async () => {
  if (!isDraft) return
  if (isBusy) return
  resetNotice()

  await runOnce('finalize', async () => {
    // ✅ クリック直後に空タブを開く（await より前！）
    const popup = window.open('about:blank', '_blank')
    if (popup) {
      try {
        popup.document.title = 'Issuing...'
        popup.document.body.innerHTML =
          '<p style="font-family:sans-serif;">発行＆PDF保存を実行しています…</p>'
      } catch {}
    }

    try {
      // 未保存ガード（localStorage dirty）
      if (!ensureSavedOrWarn()) {
        if (popup) popup.close()
        return
      }

      // x-items-hash 必須（最新を取りに行く）
      const itemsHash = await getItemsHashOrFetch()
      if (!itemsHash) {
        pushErr('明細ハッシュが見つかりません。編集画面で保存し直してください。')
        if (popup) popup.close()
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

  setPopupMessage(
    popup,
    `
    <div style="font-family:sans-serif;max-width:720px;margin:20px auto;line-height:1.6">
      <h2 style="margin:0 0 12px">発行に失敗しました</h2>
      <p style="color:#b00020;margin:0 0 12px">${friendly}</p>
      <p style="margin:0 0 8px">対処：</p>
      <ul style="margin:0 0 12px;padding-left:18px">
        <li>明細を編集した場合は、編集画面で「保存」してから再実行</li>
        <li>画面更新後に再実行（競合の可能性）</li>
        <li>ログイン切れの場合は再ログイン</li>
      </ul>
      <p style="margin:0"><a href="${location.href}" target="_self">このドキュメント画面に戻る</a></p>
    </div>
    `
  )
  return
}

      // ✅ finalize は { ok, issue, pdf } を返す想定
      const issuedDocNo =
        (json?.issue?.document?.document_no as string | undefined) ??
        (json?.issue?.document_no as string | undefined) ??
        (json?.issue?.document?.no as string | undefined) ??
        null

      if (issuedDocNo) {
        setIssuedNo(issuedDocNo)
        pushOk(`発行＋PDF保存しました：${issuedDocNo}`)
      } else {
        pushOk('発行＋PDF保存しました')
      }

      setOptimisticStatus('issued')
      // saving（履歴更新→PDFを開くフェーズ）に移す
      setFinalizeStep('saving')
      setPopupMessage(popup, '<p style="font-family:sans-serif;">PDF履歴を更新しています…</p>')

      // 履歴更新（静かに）
      await loadFiles({ silent: true })
      router.refresh()

      const newFileId =
        (json?.pdf?.file?.id as string | undefined) ??
        (json?.file?.id as string | undefined) ??
        null

     // popup がブロックされた場合は自動で開かず、履歴から開いてもらう
     if (!popup) {
       pushOk('発行＋PDF保存しました。PDF履歴から開けます。')
       return
     }

      if (newFileId) {
        setPopupMessage(popup, '<p style="font-family:sans-serif;">PDFを開きます…</p>')
        openFile(newFileId, { target: popup })
        return
      }

      // fallback：pdf-files で最新1件を開く
      const res2 = await fetch('/api/documents/' + documentId + '/pdf-files', {
        credentials: 'include',
        cache: 'no-store',
      })
      const json2 = await res2.json().catch(() => ({}))
      const firstId = res2.ok ? (json2?.files?.[0]?.id as string | undefined) : undefined

      if (firstId) {
        setPopupMessage(popup, '<p style="font-family:sans-serif;">PDFを開きます…</p>')
        openFile(firstId, { target: popup })
      } else {
        if (popup) popup.close()
      }
    } catch (e: any) {
      pushErr('Network/JS error: ' + (e?.message ?? String(e)))
      // 失敗時は popup を閉じる
      // （成功時は openFile が使うので閉じない）
      // ※popupがブロックされてる場合は null
      // eslint-disable-next-line no-empty
      try {
        // popup は scope 内
      } catch {}
    } finally {
      setFinalizeStep('idle')
      // busy は runOnce が finally で必ず解除するのでここでは触らない
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

// ✅ ここに追加（return の直前）
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

return (

  <div>
    <h2>Actions</h2>

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

      <button
  type="button"
  onClick={() => {
    setErr(null)
    if (!ensureSavedOrWarn()) return
    window.open('/api/documents/' + documentId + '/pdf', '_blank')
  }}
  disabled={previewDisabled}
  style={btnStyle(previewDisabled)}
>
  PDFプレビュー
</button>

<button type="button" onClick={() => loadFiles()} disabled={refreshDisabled} style={btnStyle(refreshDisabled)}>
  履歴更新
</button>

{isDraft && (
  <>
    <button type="button" onClick={finalize} disabled={finalizeDisabled} style={btnStyle(finalizeDisabled)}>
      {blockedByDirty
        ? '未保存のため発行不可'
        : busy === 'finalize'
          ? finalizeStep === 'issuing'
            ? '発行中…'
            : 'PDF生成中…'
          : '発行＋PDF保存（開く）'}
    </button>

    <button type="button" onClick={issue} disabled={issueDisabled} style={btnStyle(issueDisabled)}>
      {blockedByDirty ? '未保存のため不可' : busy === 'issue' ? '発行中…' : '発行（番号確定）'}
    </button>
  </>
)}

{canSavePdf && (
  <button type="button" onClick={savePdf} disabled={savePdfDisabled} style={btnStyle(savePdfDisabled)}>
    {blockedByDirty ? '未保存のため不可' : busy === 'savePdf' ? 'PDF生成中…' : 'PDF保存（履歴作成）'}
  </button>
)}

{!isDraft && (
  <button type="button" onClick={duplicateToEdit} disabled={duplicateDisabled} style={btnStyle(duplicateDisabled)}>
    {busy === 'duplicate' ? '複製中…' : '複製して編集（下書き作成）'}
  </button>
)}
    </div> {/* ✅ ← これが抜けてた */}

    {!isDraft && (
      <p style={{ color: '#666' }}>
        このドキュメントは <b>{status}</b> です。修正・再発行は「複製して編集（下書き作成）」を使ってください。
      </p>
    )}

{/* Toasts (top-right) */}
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
          aria-label="close error"
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
          aria-label="close ok"
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

  {copyMsg && (
    <div
      style={{
        border: '1px solid #99f6e4',
        background: '#f0fdfa',
        color: '#0f766e',
        borderRadius: 10,
        padding: '10px 12px',
        boxShadow: '0 6px 18px rgba(0,0,0,0.10)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ fontWeight: 700 }}>コピー</div>
        <button
          onClick={() => setCopyMsg(null)}
          aria-label="close copy"
          style={{
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: '#0f766e',
            fontSize: 16,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>
      <div style={{ marginTop: 6 }}>{copyMsg}</div>
    </div>
  )}
</div>

{/* 発行番号はトーストではなく本文で表示（必要なら残す） */}
{documentNoShown && (
  <p style={{ color: '#555' }}>
    発行番号: <b>{documentNoShown}</b>
  </p>
)}
    {busy && <p style={{ color: '#555' }}>busy: {busy}</p>}

    <h3>PDF 履歴</h3>
    <p style={{ color: '#666', marginTop: 0 }}>
      ※ PDF履歴は「発行してPDF保存」または「PDF 保存」で作成されます（Issueだけでは作成されません）。
    </p>

    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
       <tr>
         <th style={th}>日時</th>
         <th style={th}>ファイル</th>
         <th style={th}>操作</th>
       </tr>
     </thead>

      <tbody>
        {files.map((f) => (
  <tr key={f.id}>
    <td style={td}>
      <div>{formatJst(f.created_at)}</div>
      <div style={{ color: '#666', fontSize: 12 }}>{fromNow(f.created_at)}</div>
    </td>

    <td style={td} title={f.path}>
      <div style={{ fontWeight: 600 }}>{fileNameFromPath(f.path)}</div>
      <div style={{ color: '#666', fontSize: 12 }}>
        {String(f.path).slice(0, 70)}
        {String(f.path).length > 70 ? '…' : ''}
      </div>
    </td>

    <td style={td}>
  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
    <button type="button" onClick={() => onOpenClick(f.id)} disabled={!!busy} style={btnSmall}>
      開く
    </button>

    <button
      type="button"
      disabled={!!busy}
      style={btnSmall}
      onClick={async () => {
        setErr(null)
        const url = toAbsoluteUrl(getDownloadPath(f.id))
        const ok = await copyText(url)
        if (ok) showCopied('URLをコピーしました')
        else setErr('URLのコピーに失敗しました（ブラウザ権限をご確認ください）')
      }}
    >
      URLコピー
    </button>

    <button
      type="button"
      disabled={!!busy}
      style={btnSmall}
      onClick={async () => {
        setErr(null)
        const ok = await copyText(String(f.path ?? ''))
        if (ok) showCopied('パスをコピーしました')
        else setErr('パスのコピーに失敗しました（ブラウザ権限をご確認ください）')
      }}
    >
      パスコピー
    </button>
  </div>
</td>

  </tr>
))}

        {files.length === 0 && (
          <tr>
            <td style={td} colSpan={3}>
              No files yet.
            </td>
          </tr>
        )}
      </tbody>
    </table>
    </div>
)
} // ✅ これが必要（DocumentActions を閉じる）

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
    pointerEvents: 'none', // hover/clickを完全に無効
  }
}
const btnSmall = { padding: '6px 10px', border: '1px solid #ccc', borderRadius: 6, background: '#fff' } as const
const th = { textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 } as const
const td = { borderBottom: '1px solid #eee', padding: 8, verticalAlign: 'top' } as const
