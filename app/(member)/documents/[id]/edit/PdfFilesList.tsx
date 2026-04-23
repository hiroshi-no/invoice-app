'use client'

import { useEffect, useMemo, useState } from 'react'

type PdfFileItem = {
  id: string
  file_name?: string | null
  created_at?: string | null
  download_url?: string | null
  version?: number | null
  file_version?: number | null
}

function pad2(value: number) {
  return String(value).padStart(2, '0')
}

function fmtDate(value?: string | null) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)

  return `${d.getFullYear()}/${pad2(d.getMonth() + 1)}/${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

function cleanFileName(name?: string | null) {
  const raw = String(name ?? '').trim()
  if (!raw) return ''
  return raw.replace(/\.pdf$/i, '') + '.pdf'
}

function fallbackDisplayName(documentId: string) {
  return `saved-pdf-${documentId}.pdf`
}

export default function PdfFilesList({
  documentId,
  refreshKey = 0,
}: {
  documentId: string
  refreshKey?: number
}) {
  const [busy, setBusy] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [files, setFiles] = useState<PdfFileItem[]>([])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setBusy(true)
      setErr(null)

      try {
        const res = await fetch(`/api/documents/${documentId}/pdf-files`, {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        })

        const json = await res.json().catch(() => ({}))
        if (!res.ok) {
          if (!cancelled) {
            setErr(json?.message ?? `履歴の取得に失敗しました（HTTP ${res.status}）`)
          }
          return
        }

        const list = Array.isArray(json?.files)
          ? json.files
          : Array.isArray(json?.items)
            ? json.items
            : []

        if (!cancelled) {
          setFiles(list)
        }
      } catch (e: any) {
        if (!cancelled) {
          setErr(e?.message ?? '履歴の取得に失敗しました')
        }
      } finally {
        if (!cancelled) {
          setBusy(false)
        }
      }
    }

    const onPdfSaved = (event: Event) => {
      const custom = event as CustomEvent<{ documentId?: string }>
      if (custom?.detail?.documentId && custom.detail.documentId !== documentId) {
        return
      }
      void load()
    }

    void load()

    if (typeof window !== 'undefined') {
      window.addEventListener('invoice:pdf-saved', onPdfSaved as EventListener)
    }

    return () => {
      cancelled = true
      if (typeof window !== 'undefined') {
        window.removeEventListener('invoice:pdf-saved', onPdfSaved as EventListener)
      }
    }
  }, [documentId, refreshKey])

  const normalizedFiles = useMemo(() => {
    const mapped = files.map((file) => {
      const explicitVersion = Number(file.version ?? file.file_version ?? 0)
      const version =
        Number.isFinite(explicitVersion) && explicitVersion > 0
          ? explicitVersion
          : null

      const createdAtMs = file.created_at ? new Date(file.created_at).getTime() : 0

      return {
        ...file,
        displayName:
          cleanFileName(file.file_name) || fallbackDisplayName(documentId),
        displayVersion: version,
        createdAtMs: Number.isFinite(createdAtMs) ? createdAtMs : 0,
      }
    })

    return mapped
      .slice()
      .sort((a, b) => {
        if (b.createdAtMs !== a.createdAtMs) return b.createdAtMs - a.createdAtMs

        const av = a.displayVersion ?? 0
        const bv = b.displayVersion ?? 0
        return bv - av
      })
      .map((file, index) => ({
        ...file,
        isLatest: index === 0,
      }))
  }, [files, documentId])

  return (
    <section
      style={{
        marginTop: 20,
        border: '1px solid #e5e7eb',
        borderRadius: 14,
        background: '#fff',
        padding: 16,
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 8,
        }}
      >
        <div
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: '#111827',
          }}
        >
          保存済みPDF履歴
        </div>

        {!busy && !err && normalizedFiles.length > 0 && (
          <div
            style={{
              fontSize: 12,
              color: '#6b7280',
              background: '#f8fafc',
              border: '1px solid #e5e7eb',
              borderRadius: 999,
              padding: '4px 10px',
              fontWeight: 600,
            }}
          >
            {normalizedFiles.length}件
          </div>
        )}
      </div>

      <div
        style={{
          fontSize: 12,
          color: '#6b7280',
          marginBottom: 12,
          lineHeight: 1.5,
        }}
      >
        保存したPDFの履歴です。最新のPDFには「最新」バッジが表示されます。
      </div>

      {busy && (
        <div
          style={{
            fontSize: 13,
            color: '#6b7280',
            padding: '8px 0',
          }}
        >
          読込中…
        </div>
      )}

      {err && (
        <div
          style={{
            fontSize: 13,
            color: 'crimson',
            padding: '8px 0',
          }}
        >
          {err}
        </div>
      )}

      {!busy && !err && normalizedFiles.length === 0 && (
        <div
          style={{
            border: '1px dashed #d1d5db',
            borderRadius: 12,
            background: '#f9fafb',
            padding: 16,
            fontSize: 13,
            color: '#6b7280',
          }}
        >
          まだ保存済みPDFはありません。保存するとここに履歴が表示されます。
        </div>
      )}

      {!busy && !err && normalizedFiles.length > 0 && (
        <div style={{ display: 'grid', gap: 10 }}>
          {normalizedFiles.map((file) => {
            const fallbackDownload =
              `/api/documents/${documentId}/pdf-files/${file.id}/download`

            return (
              <div
                key={file.id}
                style={{
                  border: file.isLatest ? '1px solid #c7d2fe' : '1px solid #e5e7eb',
                  borderRadius: 12,
                  padding: 14,
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 16,
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  background: file.isLatest ? '#f8faff' : '#fff',
                }}
              >
                <div style={{ minWidth: 0, flex: '1 1 320px' }}>
                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      alignItems: 'center',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: '#111827',
                        wordBreak: 'break-word',
                      }}
                    >
                      {file.displayName}
                    </div>

                    {file.displayVersion ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '3px 8px',
                          borderRadius: 999,
                          border: '1px solid #e5e7eb',
                          background: '#f9fafb',
                          color: '#374151',
                          fontSize: 12,
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        v{file.displayVersion}
                      </span>
                    ) : null}

                    {file.isLatest ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '3px 8px',
                          borderRadius: 999,
                          border: '1px solid #c7d2fe',
                          background: '#eef2ff',
                          color: '#4338ca',
                          fontSize: 12,
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        最新
                      </span>
                    ) : null}
                  </div>

                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 12,
                      color: '#6b7280',
                      display: 'flex',
                      gap: 12,
                      flexWrap: 'wrap',
                    }}
                  >
                    <span>保存: {fmtDate(file.created_at)}</span>
                  </div>
                </div>

                <a
                  href={file.download_url || fallbackDownload}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 120,
                    padding: '10px 14px',
                    border: '1px solid #d1d5db',
                    borderRadius: 10,
                    background: file.isLatest ? '#111827' : '#fff',
                    color: file.isLatest ? '#fff' : '#111827',
                    textDecoration: 'none',
                    fontSize: 13,
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                  }}
                >
                  ダウンロード
                </a>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}