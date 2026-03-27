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

export default function DocumentPdfSummaryCard({
  documentId,
}: {
  documentId: string
}) {
  const [busy, setBusy] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [files, setFiles] = useState<PdfFileItem[]>([])
  const [open, setOpen] = useState(false)

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
            setErr(json?.message ?? `PDF履歴の取得に失敗しました（HTTP ${res.status}）`)
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
          setErr(e?.message ?? 'PDF履歴の取得に失敗しました')
        }
      } finally {
        if (!cancelled) {
          setBusy(false)
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [documentId])

  const normalizedFiles = useMemo(() => {
    const mapped = files.map((file) => {
      const explicitVersion = Number(file.version ?? file.file_version ?? 0)
      const displayVersion =
        Number.isFinite(explicitVersion) && explicitVersion > 0
          ? explicitVersion
          : null

      const createdAtMs = file.created_at ? new Date(file.created_at).getTime() : 0

      return {
        ...file,
        displayName:
          cleanFileName(file.file_name) || fallbackDisplayName(documentId),
        displayVersion,
        createdAtMs: Number.isFinite(createdAtMs) ? createdAtMs : 0,
      }
    })

    return mapped
      .slice()
      .sort((a, b) => {
        if (b.createdAtMs !== a.createdAtMs) return b.createdAtMs - a.createdAtMs
        return (b.displayVersion ?? 0) - (a.displayVersion ?? 0)
      })
  }, [files, documentId])

  const latest = normalizedFiles[0] ?? null

  return (
    <section
      style={{
        marginTop: 24,
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        background: '#fff',
        padding: 16,
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
        <h2 style={{ margin: 0, fontSize: 18 }}>保存済みPDF</h2>

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
          lineHeight: 1.5,
          marginBottom: 12,
        }}
      >
        最新のPDFをすぐ確認できます。過去の版は必要なときだけ表示できます。
      </div>

      {busy && <div style={{ fontSize: 13, color: '#6b7280' }}>読込中…</div>}

      {err && <div style={{ fontSize: 13, color: 'crimson' }}>{err}</div>}

      {!busy && !err && !latest && (
        <div
          style={{
            border: '1px dashed #d1d5db',
            borderRadius: 10,
            background: '#f9fafb',
            padding: 14,
            fontSize: 13,
            color: '#6b7280',
          }}
        >
          まだ保存済みPDFはありません。
        </div>
      )}

      {!busy && !err && latest && (
        <>
          <div
            style={{
              border: '1px solid #dbeafe',
              borderRadius: 12,
              background: '#f8fbff',
              padding: 14,
            }}
          >
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
                {latest.displayName}
              </div>

              {latest.displayVersion ? (
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
                  v{latest.displayVersion}
                </span>
              ) : null}

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
            </div>

            <div
              style={{
                marginTop: 8,
                fontSize: 12,
                color: '#6b7280',
              }}
            >
              保存: {fmtDate(latest.created_at)}
            </div>

            <div
              style={{
                display: 'flex',
                gap: 10,
                flexWrap: 'wrap',
                marginTop: 12,
              }}
            >
              <a
                href={
                  latest.download_url ||
                  `/api/documents/${documentId}/pdf-files/${latest.id}/download`
                }
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 140,
                  padding: '10px 14px',
                  border: '1px solid #111827',
                  borderRadius: 10,
                  background: '#111827',
                  color: '#fff',
                  textDecoration: 'none',
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                最新をダウンロード
              </a>

              {normalizedFiles.length > 1 && (
                <button
                  type="button"
                  onClick={() => setOpen((v) => !v)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 120,
                    padding: '10px 14px',
                    border: '1px solid #d1d5db',
                    borderRadius: 10,
                    background: '#fff',
                    color: '#111827',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {open ? '履歴を隠す' : '履歴を表示'}
                </button>
              )}
            </div>
          </div>

          {open && normalizedFiles.length > 1 && (
            <div
              style={{
                marginTop: 12,
                display: 'grid',
                gap: 8,
              }}
            >
              {normalizedFiles.map((file, index) => {
                if (index === 0) return null

                return (
                  <div
                    key={file.id}
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: 10,
                      padding: 12,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 12,
                      flexWrap: 'wrap',
                      background: '#fff',
                    }}
                  >
                    <div style={{ minWidth: 0, flex: '1 1 280px' }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: '#111827',
                          wordBreak: 'break-word',
                        }}
                      >
                        {file.displayName}
                      </div>
                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 12,
                          color: '#6b7280',
                        }}
                      >
                        保存: {fmtDate(file.created_at)}
                      </div>
                    </div>

                    <a
                      href={
                        file.download_url ||
                        `/api/documents/${documentId}/pdf-files/${file.id}/download`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: 110,
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: 8,
                        background: '#fff',
                        color: '#111827',
                        textDecoration: 'none',
                        fontSize: 12,
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      ダウンロード
                    </a>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </section>
  )
}