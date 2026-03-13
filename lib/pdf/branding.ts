// lib/pdf/branding.ts
import { Buffer } from 'node:buffer'
import { getCurrentOrgIdForUser } from '@/lib/org/getCurrentOrgId'

export type TemplateKey = 'classic' | 'minimal'

export type Branding = {
  // buildInvoiceHtml が参照する
  brandColor: string
  templateKey: TemplateKey
  footerText: string
  logoDataUri: string | null

  // 互換（他コードが参照してても壊れないよう残す）
  logoDataUrl: string | null
  logoMime: string | null
  logoPath: string | null
}

const DEFAULT_BRAND_COLOR = '#111827'
const DEFAULT_TEMPLATE: TemplateKey = 'classic'
const DEFAULT_FOOTER = ''

function pickNonEmptyString(v: any, fallback: string) {
  return typeof v === 'string' && v.trim() ? v.trim() : fallback
}

function pickTemplateKey(v: any): TemplateKey {
  const s = typeof v === 'string' ? v.trim() : ''
  return s === 'minimal' ? 'minimal' : 'classic'
}

export async function loadOrgBranding(supabase: any, orgId: string): Promise<Branding> {
  // ※DBカラムが無い環境でも壊れないよう、まずはロゴだけ読む（最小）
  const { data: settings, error: sErr } = await supabase
    .from('user_settings')
    .select('logo_path, logo_mime')
    .eq('org_id', orgId)
    .maybeSingle()

  if (sErr) throw new Error(sErr.message)

  const logoPath = String((settings as any)?.logo_path ?? '')
  const logoMime = String((settings as any)?.logo_mime ?? '')

  // ロゴ以外はデフォルト（DB拡張するなら後でここを select に追加）
  const brandColor = DEFAULT_BRAND_COLOR
  const templateKey = DEFAULT_TEMPLATE
  const footerText = DEFAULT_FOOTER

  if (!logoPath) {
    return {
      brandColor,
      templateKey,
      footerText,
      logoDataUri: null,
      logoDataUrl: null,
      logoMime: null,
      logoPath: null,
    }
  }

  const { data: blob, error: dErr } = await supabase.storage.from('branding').download(logoPath)
  if (dErr || !blob) {
    return {
      brandColor,
      templateKey,
      footerText,
      logoDataUri: null,
      logoDataUrl: null,
      logoMime: logoMime || null,
      logoPath,
    }
  }

  const ab = await blob.arrayBuffer()
  const buf = Buffer.from(ab)
  const mime = logoMime || (blob as any).type || 'image/png'
  const dataUri = `data:${mime};base64,${buf.toString('base64')}`

  return {
    brandColor,
    templateKey,
    footerText,
    logoDataUri: dataUri,
    logoDataUrl: dataUri, // 互換
    logoMime: mime,
    logoPath,
  }
}

/**
 * 互換：userId -> current_org_id -> org branding
 */
export async function loadUserBranding(supabase: any, userId: string): Promise<Branding> {
  const result = await getCurrentOrgIdForUser(supabase, userId)

  // DBエラー等はそのまま上に投げる
  if (result.error) {
    throw result.error
  }

  const orgId = String(result.orgId ?? '')
  if (!orgId) {
    return {
      brandColor: DEFAULT_BRAND_COLOR,
      templateKey: DEFAULT_TEMPLATE,
      footerText: DEFAULT_FOOTER,
      logoDataUri: null,
      logoDataUrl: null,
      logoMime: null,
      logoPath: null,
    }
  }

  return loadOrgBranding(supabase, orgId)
}