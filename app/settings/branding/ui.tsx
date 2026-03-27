'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'

type TemplateKey = 'classic' | 'minimal' | 'modern' | 'elegant' | 'corporate'

type State =
  | { loading: true }
  | {
      loading: false
      imageUrl: string | null
      path: string | null
      mime: string | null
      brandColor: string
      templateKey: TemplateKey
      footerText: string
      issuerName: string
      issuerPostalCode: string
      issuerAddress1: string
      issuerAddress2: string
      issuerEmail: string
      issuerPhone: string
      issuerFax: string
    }

const DEFAULT_FORM = {
  brandColor: '#111827',
  templateKey: 'classic' as const,
  footerText: '',
  issuerName: '',
  issuerPostalCode: '',
  issuerAddress1: '',
  issuerAddress2: '',
  issuerEmail: '',
  issuerPhone: '',
  issuerFax: '',
}

function normalizeTemplateKey(v: any): TemplateKey {
  const s = typeof v === 'string' ? v.trim().toLowerCase() : ''
  switch (s) {
    case 'minimal':
    case 'modern':
    case 'elegant':
    case 'corporate':
    case 'classic':
      return s
    default:
      return 'classic'
  }
}

export default function BrandingSettings() {
  const router = useRouter()
  const [state, setState] = useState<State>({ loading: true })
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)
  const [imgRev, setImgRev] = useState(0)

  const [pickedFile, setPickedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [templateKey, setTemplateKey] = useState<TemplateKey>(DEFAULT_FORM.templateKey)

  const load = async () => {
  setErr(null)
  setOkMsg(null)
  setState({ loading: true })

  const [logoRes, brandingRes] = await Promise.all([
    fetch('/api/user-settings/branding/logo', { cache: 'no-store' }),
    fetch('/api/user-settings/branding', { cache: 'no-store' }),
  ])

  if (logoRes.status === 401 || brandingRes.status === 401) {
    router.push('/login')
    return
  }

  const logoJson = await logoRes.json().catch(() => ({}))
  const brandingJson = await brandingRes.json().catch(() => ({}))

  if (!logoRes.ok) {
    setState({
      loading: false,
      imageUrl: null,
      path: null,
      mime: null,
      ...DEFAULT_FORM,
    })
    setErr(`HTTP ${logoRes.status}: ${logoJson.error ?? 'logo load failed'}`)
    return
  }

  if (!brandingRes.ok) {
    setState({
      loading: false,
      imageUrl: null,
      path: null,
      mime: null,
      ...DEFAULT_FORM,
    })
    setErr(`HTTP ${brandingRes.status}: ${brandingJson.error ?? 'branding load failed'}`)
    return
  }

  const logo = logoJson.logo ?? null
  const branding = brandingJson.branding ?? {}

   const normalizedTemplateKey = normalizeTemplateKey(branding.templateKey)

  setTemplateKey(normalizedTemplateKey)

  setState({
    loading: false,
    imageUrl: logo?.path ? '/api/user-settings/branding/logo/image' : null,
    path: logo?.path ?? null,
    mime: logo?.mime ?? null,

    brandColor: String(branding.brandColor ?? DEFAULT_FORM.brandColor),
    templateKey: normalizedTemplateKey,
    footerText: String(branding.footerText ?? ''),
    issuerName: String(branding.issuerName ?? ''),
    issuerPostalCode: String(branding.issuerPostalCode ?? ''),
    issuerAddress1: String(branding.issuerAddress1 ?? ''),
    issuerAddress2: String(branding.issuerAddress2 ?? ''),
    issuerEmail: String(branding.issuerEmail ?? ''),
    issuerPhone: String(branding.issuerPhone ?? ''),
    issuerFax: String(branding.issuerFax ?? ''),
  })

  setImgRev(Date.now())
}

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onPick = async (file: File | null) => {
    if (!file) return
    setErr(null)
    setOkMsg(null)
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
      await load()
      setOkMsg('ロゴを保存しました。')
    } finally {
      setBusy(null)
    }
  }

  const onDelete = async () => {
    setErr(null)
    setOkMsg(null)
    setBusy('deleting')
    try {
      const res = await fetch('/api/user-settings/branding/logo', { method: 'DELETE' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErr(`HTTP ${res.status}: ${json.error ?? 'delete failed'}`)
        return
      }
      await load()
      setOkMsg('ロゴを削除しました。')
    } finally {
      setBusy(null)
    }
  }

  const handlePick = async (file: File | null) => {
    setPickedFile(file)
    if (!file) return

    try {
      await onPick(file)
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
      setPickedFile(null)
    }
  }

  const onSaveBranding = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (state.loading) return

    setErr(null)
    setOkMsg(null)
    setBusy('saving')

    const form = new FormData(e.currentTarget)

    const payload = {
      brandColor: String(form.get('brandColor') ?? ''),
      templateKey,
      footerText: String(form.get('footerText') ?? ''),
      issuerName: String(form.get('issuerName') ?? ''),
      issuerPostalCode: String(form.get('issuerPostalCode') ?? ''),
      issuerAddress1: String(form.get('issuerAddress1') ?? ''),
      issuerAddress2: String(form.get('issuerAddress2') ?? ''),
      issuerEmail: String(form.get('issuerEmail') ?? ''),
      issuerPhone: String(form.get('issuerPhone') ?? ''),
      issuerFax: String(form.get('issuerFax') ?? ''),
    }

    try {
      const res = await fetch('/api/user-settings/branding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        setErr(`HTTP ${res.status}: ${json.error ?? 'save failed'}`)
        return
      }

      await load()
      setOkMsg('ブランディング設定を保存しました。')
    } finally {
      setBusy(null)
    }
  }

  const imageUrl = state.loading ? null : state.imageUrl

  const imgSrc = useMemo(() => {
    if (!imageUrl) return null
    const sep = imageUrl.includes('?') ? '&' : '?'
    return `${imageUrl}${sep}t=${imgRev}`
  }, [imageUrl, imgRev])

  return (
  <section style={{ maxWidth: 820, margin: '0 auto', padding: '0 16px' }}>
    {err && (
      <div style={{ padding: 12, background: '#fee2e2', borderRadius: 8, marginBottom: 12 }}>
        {err}
      </div>
    )}

    {okMsg && (
      <div style={{ padding: 12, background: '#dcfce7', borderRadius: 8, marginBottom: 12 }}>
        {okMsg}
      </div>
    )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '280px 1fr',
          gap: 24,
          alignItems: 'start',
        }}
      >
        <div>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>現在のロゴ</div>
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

          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>アップロード / 差し替え</div>

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

            <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                onClick={load}
                disabled={!!busy}
                style={btnStyle}
                type="button"
              >
                再読み込み
              </button>

              <button
                onClick={onDelete}
                disabled={!!busy || (state.loading ? true : !state.path)}
                style={btnStyle}
                type="button"
              >
                ロゴ削除
              </button>

              {busy && <span style={{ fontSize: 12, color: '#666' }}>{busy}...</span>}
            </div>
          </div>
        </div>

        <form onSubmit={onSaveBranding}>
          <div style={cardStyle}>
            <h2 style={h2Style}>PDF表示設定</h2>

            <div style={fieldStyle}>
              <label style={labelStyle}>ブランドカラー</label>
              <input
                name="brandColor"
                type="text"
                defaultValue={state.loading ? DEFAULT_FORM.brandColor : state.brandColor}
                style={inputStyle}
                placeholder="#111827"
              />
            </div>

            <div style={fieldStyle}>
  <label style={labelStyle}>テンプレート</label>

  <input type="hidden" name="templateKey" value={templateKey} />

  <div style={templateGridStyle}>
    <button
      type="button"
      onClick={() => setTemplateKey('classic')}
      style={templateCardStyle(templateKey === 'classic')}
    >
      <div style={templateCardHeaderStyle}>
        <div style={templateCardTitleStyle}>classic</div>
        <div style={templateCardBadgeStyle(templateKey === 'classic')}>
          {templateKey === 'classic' ? '選択中' : '選択'}
        </div>
      </div>

      <div style={templatePreviewClassicStyle}>
        <div style={previewClassicTitleStyle} />
        <div style={previewClassicMetaStyle} />
        <div style={previewClassicMetaShortStyle} />

        <div style={previewClassicTableStyle}>
          <div style={previewClassicTableHeadStyle} />
          <div style={previewClassicRowStyle} />
          <div style={previewClassicRowStyle} />
          <div style={previewClassicRowStyle} />
        </div>

        <div style={previewClassicSumBoxStyle}>
          <div style={previewClassicSumLineStyle} />
          <div style={previewClassicSumLineStyle} />
          <div style={previewClassicSumStrongStyle} />
        </div>
      </div>

      <div style={templateDescStyle}>
        しっかりした帳票感。提出用・正式書類向け。
      </div>
    </button>

    <button
      type="button"
      onClick={() => setTemplateKey('minimal')}
      style={templateCardStyle(templateKey === 'minimal')}
    >
      <div style={templateCardHeaderStyle}>
        <div style={templateCardTitleStyle}>minimal</div>
        <div style={templateCardBadgeStyle(templateKey === 'minimal')}>
          {templateKey === 'minimal' ? '選択中' : '選択'}
        </div>
      </div>

      <div style={templatePreviewMinimalStyle}>
        <div style={previewMinimalTitleStyle} />
        <div style={previewMinimalDividerStyle} />
        <div style={previewMinimalMetaStyle} />
        <div style={previewMinimalMetaShortStyle} />

        <div style={previewMinimalTableStyle}>
          <div style={previewMinimalTableHeadStyle} />
          <div style={previewMinimalRowStyle} />
          <div style={previewMinimalRowStyle} />
          <div style={previewMinimalRowStyle} />
        </div>

        <div style={previewMinimalSumBoxStyle}>
          <div style={previewMinimalSumLineStyle} />
          <div style={previewMinimalSumLineStyle} />
          <div style={previewMinimalSumStrongStyle} />
        </div>
      </div>

      <div style={templateDescStyle}>
        余白重視で軽やかな見た目。上品でシンプル。
      </div>
    </button>

    <button
      type="button"
      onClick={() => setTemplateKey('modern')}
      style={templateCardStyle(templateKey === 'modern')}
    >
      <div style={templateCardHeaderStyle}>
        <div style={templateCardTitleStyle}>modern</div>
        <div style={templateCardBadgeStyle(templateKey === 'modern')}>
          {templateKey === 'modern' ? '選択中' : '選択'}
        </div>
      </div>

      <div style={templatePreviewModernStyle}>
        <div style={previewModernAccentStyle} />
        <div style={previewModernTitleStyle} />
        <div style={previewModernSubStyle} />

        <div style={previewModernTableStyle}>
          <div style={previewModernTableHeadStyle} />
          <div style={previewModernRowStyle} />
          <div style={previewModernRowStyle} />
          <div style={previewModernRowStyle} />
        </div>

        <div style={previewModernSumBoxStyle}>
          <div style={previewModernSumLineStyle} />
          <div style={previewModernSumLineStyle} />
          <div style={previewModernSumStrongStyle} />
        </div>
      </div>

      <div style={templateDescStyle}>
        現代的で洗練された見た目。IT・スタートアップ・フリーランス向け。
      </div>
    </button>

    <button
      type="button"
      onClick={() => setTemplateKey('elegant')}
      style={templateCardStyle(templateKey === 'elegant')}
    >
      <div style={templateCardHeaderStyle}>
        <div style={templateCardTitleStyle}>elegant</div>
        <div style={templateCardBadgeStyle(templateKey === 'elegant')}>
          {templateKey === 'elegant' ? '選択中' : '選択'}
        </div>
      </div>

      <div style={templatePreviewElegantStyle}>
        <div style={previewElegantTitleStyle} />
        <div style={previewElegantSubStyle} />
        <div style={previewElegantTableStyle}>
          <div style={previewElegantTableHeadStyle} />
          <div style={previewElegantRowStyle} />
          <div style={previewElegantRowStyle} />
          <div style={previewElegantRowStyle} />
        </div>

        <div style={previewElegantSumBoxStyle}>
          <div style={previewElegantSumLineStyle} />
          <div style={previewElegantSumLineStyle} />
          <div style={previewElegantSumStrongStyle} />
        </div>
      </div>

      <div style={templateDescStyle}>
        落ち着きと高級感を重視。サロン・ハンドメイド・上品なブランド向け。
      </div>
    </button>

    <button
      type="button"
      onClick={() => setTemplateKey('corporate')}
      style={templateCardStyle(templateKey === 'corporate')}
    >
      <div style={templateCardHeaderStyle}>
        <div style={templateCardTitleStyle}>corporate</div>
        <div style={templateCardBadgeStyle(templateKey === 'corporate')}>
          {templateKey === 'corporate' ? '選択中' : '選択'}
        </div>
      </div>

      <div style={templatePreviewCorporateStyle}>
        <div style={previewCorporateTitleStyle} />
        <div style={previewCorporateMetaStyle} />
        <div style={previewCorporateTableStyle}>
          <div style={previewCorporateTableHeadStyle} />
          <div style={previewCorporateRowStyle} />
          <div style={previewCorporateRowStyle} />
          <div style={previewCorporateRowStyle} />
        </div>

        <div style={previewCorporateSumBoxStyle}>
          <div style={previewCorporateSumLineStyle} />
          <div style={previewCorporateSumLineStyle} />
          <div style={previewCorporateSumStrongStyle} />
        </div>
      </div>

      <div style={templateDescStyle}>
        実務的で信頼感のある見た目。法人営業・B2B・堅めの業種向け。
      </div>
    </button>
  </div>
</div>

            <div style={fieldStyle}>
              <label style={labelStyle}>フッターテキスト</label>
              <textarea
                name="footerText"
                defaultValue={state.loading ? DEFAULT_FORM.footerText : state.footerText}
                style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }}
                placeholder="振込先や注意事項など"
              />
            </div>
          </div>

          <div style={{ ...cardStyle, marginTop: 16 }}>
            <h2 style={h2Style}>発行者情報</h2>

            <div style={fieldStyle}>
              <label style={labelStyle}>発行者名</label>
              <input
                name="issuerName"
                defaultValue={state.loading ? '' : state.issuerName}
                style={inputStyle}
                placeholder="株式会社サンプル"
              />
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>郵便番号</label>
              <input
                name="issuerPostalCode"
                defaultValue={state.loading ? '' : state.issuerPostalCode}
                style={inputStyle}
                placeholder="550-0001"
              />
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>住所1</label>
              <input
                name="issuerAddress1"
                defaultValue={state.loading ? '' : state.issuerAddress1}
                style={inputStyle}
                placeholder="大阪府大阪市..."
              />
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>住所2</label>
              <input
                name="issuerAddress2"
                defaultValue={state.loading ? '' : state.issuerAddress2}
                style={inputStyle}
                placeholder="ビル名・部屋番号など"
              />
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>メールアドレス</label>
              <input
                name="issuerEmail"
                defaultValue={state.loading ? '' : state.issuerEmail}
                style={inputStyle}
                placeholder="info@example.com"
              />
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>電話番号</label>
              <input
                name="issuerPhone"
                defaultValue={state.loading ? '' : state.issuerPhone}
                style={inputStyle}
                placeholder="06-1234-5678"
              />
            </div>

             <div style={fieldStyle}>
                <label style={labelStyle}>FAX</label>
                <input
                  name="issuerFax"
                  defaultValue={state.loading ? '' : state.issuerFax}
                  style={inputStyle}
                  placeholder="06-1234-9999"
                />
             </div>
              </div>

          <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            <button type="submit" disabled={!!busy || state.loading} style={primaryBtnStyle}>
              設定を保存
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}

const cardStyle: React.CSSProperties = {
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  padding: 16,
  background: '#fff',
}

const h2Style: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  margin: '0 0 14px 0',
}

const fieldStyle: React.CSSProperties = {
  display: 'grid',
  gap: 6,
  marginBottom: 14,
}

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  color: '#374151',
  fontWeight: 600,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  border: '1px solid #d1d5db',
  borderRadius: 10,
  padding: '10px 12px',
  fontSize: 14,
  background: '#fff',
}

const btnStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid #ddd',
  background: '#fff',
}

const primaryBtnStyle: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 10,
  border: '1px solid #111827',
  background: '#111827',
  color: '#fff',
  fontWeight: 700,
}
const templateGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  gap: 14,
}

function templateCardStyle(selected: boolean): React.CSSProperties {
  return {
    width: '100%',
    textAlign: 'left',
    border: selected ? '2px solid #111827' : '1px solid #d1d5db',
    borderRadius: 14,
    padding: 14,
    background: '#fff',
    cursor: 'pointer',
    boxShadow: selected ? '0 8px 24px rgba(17,24,39,0.10)' : '0 2px 8px rgba(0,0,0,0.04)',
  }
}

const templateCardHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 12,
  marginBottom: 12,
}

const templateCardTitleStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 700,
  color: '#111827',
}

function templateCardBadgeStyle(selected: boolean): React.CSSProperties {
  return {
    fontSize: 12,
    fontWeight: 700,
    color: selected ? '#111827' : '#6b7280',
    background: selected ? '#f3f4f6' : '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: 999,
    padding: '4px 8px',
  }
}

const templateDescStyle: React.CSSProperties = {
  marginTop: 10,
  fontSize: 12,
  color: '#6b7280',
  lineHeight: 1.6,
}

const templatePreviewClassicStyle: React.CSSProperties = {
  border: '1px solid #d1d5db',
  borderRadius: 12,
  padding: 12,
  background: '#fff',
}

const previewClassicTitleStyle: React.CSSProperties = {
  width: '48%',
  height: 12,
  background: '#111827',
  marginBottom: 10,
}

const previewClassicMetaStyle: React.CSSProperties = {
  width: '62%',
  height: 8,
  background: '#d1d5db',
  marginBottom: 6,
}

const previewClassicMetaShortStyle: React.CSSProperties = {
  width: '44%',
  height: 8,
  background: '#e5e7eb',
  marginBottom: 12,
}

const previewClassicTableStyle: React.CSSProperties = {
  border: '1px solid #d1d5db',
  borderRadius: 8,
  overflow: 'hidden',
  marginBottom: 12,
}

const previewClassicTableHeadStyle: React.CSSProperties = {
  height: 18,
  background: '#111827',
}

const previewClassicRowStyle: React.CSSProperties = {
  height: 16,
  borderTop: '1px solid #e5e7eb',
  background: '#fff',
}

const previewClassicSumBoxStyle: React.CSSProperties = {
  width: '44%',
  marginLeft: 'auto',
}

const previewClassicSumLineStyle: React.CSSProperties = {
  height: 8,
  background: '#e5e7eb',
  marginBottom: 6,
}

const previewClassicSumStrongStyle: React.CSSProperties = {
  height: 10,
  background: '#d1d5db',
}

const templatePreviewMinimalStyle: React.CSSProperties = {
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  padding: 12,
  background: '#fff',
}

const previewMinimalTitleStyle: React.CSSProperties = {
  width: '46%',
  height: 11,
  background: '#374151',
  marginBottom: 8,
}

const previewMinimalDividerStyle: React.CSSProperties = {
  width: '100%',
  height: 1,
  background: '#e5e7eb',
  marginBottom: 10,
}

const previewMinimalMetaStyle: React.CSSProperties = {
  width: '58%',
  height: 7,
  background: '#e5e7eb',
  marginBottom: 6,
}

const previewMinimalMetaShortStyle: React.CSSProperties = {
  width: '40%',
  height: 7,
  background: '#f1f5f9',
  marginBottom: 12,
}

const previewMinimalTableStyle: React.CSSProperties = {
  borderTop: '1px solid #cbd5e1',
  borderBottom: '1px solid #cbd5e1',
  marginBottom: 12,
}

const previewMinimalTableHeadStyle: React.CSSProperties = {
  height: 18,
  background: '#f8fafc',
  borderBottom: '1px solid #cbd5e1',
}

const previewMinimalRowStyle: React.CSSProperties = {
  height: 16,
  borderTop: '1px solid #f1f5f9',
  background: '#fff',
}

const previewMinimalSumBoxStyle: React.CSSProperties = {
  width: '46%',
  marginLeft: 'auto',
}

const previewMinimalSumLineStyle: React.CSSProperties = {
  height: 8,
  background: '#f1f5f9',
  marginBottom: 6,
}

const previewMinimalSumStrongStyle: React.CSSProperties = {
  height: 12,
  background: '#f9fafb',
  borderRadius: 6,
}

const templatePreviewModernStyle: React.CSSProperties = {
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  padding: 12,
  background: '#ffffff',
}

const previewModernAccentStyle: React.CSSProperties = {
  width: '100%',
  height: 8,
  background: '#111827',
  borderRadius: 999,
  marginBottom: 10,
}

const previewModernTitleStyle: React.CSSProperties = {
  width: '52%',
  height: 11,
  background: '#1f2937',
  marginBottom: 8,
}

const previewModernSubStyle: React.CSSProperties = {
  width: '62%',
  height: 8,
  background: '#e5e7eb',
  marginBottom: 12,
  borderRadius: 6,
}

const previewModernTableStyle: React.CSSProperties = {
  border: '1px solid #e5e7eb',
  borderRadius: 10,
  overflow: 'hidden',
  marginBottom: 12,
}

const previewModernTableHeadStyle: React.CSSProperties = {
  height: 18,
  background: '#0f172a',
}

const previewModernRowStyle: React.CSSProperties = {
  height: 16,
  borderTop: '1px solid #eef2f7',
  background: '#fff',
}

const previewModernSumBoxStyle: React.CSSProperties = {
  width: '46%',
  marginLeft: 'auto',
  border: '1px solid #e5e7eb',
  borderRadius: 10,
  padding: 8,
  background: '#fff',
}

const previewModernSumLineStyle: React.CSSProperties = {
  height: 8,
  background: '#e5e7eb',
  marginBottom: 6,
  borderRadius: 6,
}

const previewModernSumStrongStyle: React.CSSProperties = {
  height: 10,
  background: '#d1d5db',
  borderRadius: 6,
}

const templatePreviewElegantStyle: React.CSSProperties = {
  border: '1px solid #e7e5e4',
  borderRadius: 12,
  padding: 12,
  background: '#fdfcfb',
}

const previewElegantTitleStyle: React.CSSProperties = {
  width: '50%',
  height: 11,
  background: '#57534e',
  marginBottom: 8,
}

const previewElegantSubStyle: React.CSSProperties = {
  width: '58%',
  height: 7,
  background: '#d6d3d1',
  marginBottom: 12,
}

const previewElegantTableStyle: React.CSSProperties = {
  borderTop: '2px solid #a8a29e',
  borderBottom: '1px solid #d6d3d1',
  marginBottom: 12,
}

const previewElegantTableHeadStyle: React.CSSProperties = {
  height: 18,
  background: '#f7f5f4',
  borderBottom: '1px solid #d6d3d1',
}

const previewElegantRowStyle: React.CSSProperties = {
  height: 16,
  borderTop: '1px solid #f1f0ee',
  background: '#fdfcfb',
}

const previewElegantSumBoxStyle: React.CSSProperties = {
  width: '46%',
  marginLeft: 'auto',
}

const previewElegantSumLineStyle: React.CSSProperties = {
  height: 8,
  background: '#ece7e3',
  marginBottom: 6,
}

const previewElegantSumStrongStyle: React.CSSProperties = {
  height: 10,
  background: '#d6d3d1',
}

const templatePreviewCorporateStyle: React.CSSProperties = {
  border: '1px solid #cbd5e1',
  borderRadius: 12,
  padding: 12,
  background: '#fff',
}

const previewCorporateTitleStyle: React.CSSProperties = {
  width: '54%',
  height: 11,
  background: '#0f172a',
  marginBottom: 8,
}

const previewCorporateMetaStyle: React.CSSProperties = {
  width: '60%',
  height: 8,
  background: '#cbd5e1',
  marginBottom: 12,
}

const previewCorporateTableStyle: React.CSSProperties = {
  border: '1px solid #94a3b8',
  marginBottom: 12,
}

const previewCorporateTableHeadStyle: React.CSSProperties = {
  height: 18,
  background: '#e2e8f0',
  borderBottom: '1px solid #94a3b8',
}

const previewCorporateRowStyle: React.CSSProperties = {
  height: 16,
  borderTop: '1px solid #cbd5e1',
  background: '#fff',
}

const previewCorporateSumBoxStyle: React.CSSProperties = {
  width: '46%',
  marginLeft: 'auto',
  border: '1px solid #94a3b8',
}

const previewCorporateSumLineStyle: React.CSSProperties = {
  height: 8,
  background: '#cbd5e1',
  marginBottom: 6,
}

const previewCorporateSumStrongStyle: React.CSSProperties = {
  height: 10,
  background: '#94a3b8',
}