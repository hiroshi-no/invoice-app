// lib/pdf/branding.ts
import { Buffer } from 'node:buffer'
import { getCurrentOrgIdForUser } from '@/lib/org/getCurrentOrgId'

export type TemplateKey =
  | 'classic'
  | 'minimal'
  | 'modern'
  | 'elegant'
  | 'corporate'

export type Branding = {
  // buildInvoiceHtml が参照する
  brandColor: string
  templateKey: TemplateKey
  footerText: string
  logoDataUri: string | null

  // 発行者情報
  issuerName: string
  issuerPostalCode: string
  issuerAddress1: string
  issuerAddress2: string
  issuerEmail: string
  issuerPhone: string
  issuerFax: string

  // 互換（他コードが参照してても壊れないよう残す）
  logoDataUrl: string | null
  logoMime: string | null
  logoPath: string | null
}

const DEFAULT_BRAND_COLOR = '#111827'
const DEFAULT_TEMPLATE: TemplateKey = 'classic'
const DEFAULT_FOOTER = ''

const DEFAULT_ISSUER_NAME = ''
const DEFAULT_ISSUER_POSTAL_CODE = ''
const DEFAULT_ISSUER_ADDRESS1 = ''
const DEFAULT_ISSUER_ADDRESS2 = ''
const DEFAULT_ISSUER_EMAIL = ''
const DEFAULT_ISSUER_PHONE = ''
const DEFAULT_ISSUER_FAX = ''

const TEMPLATE_KEYS: TemplateKey[] = [
  'classic',
  'minimal',
  'modern',
  'elegant',
  'corporate',
]

function pickNonEmptyString(v: any, fallback: string) {
  return typeof v === 'string' && v.trim() ? v.trim() : fallback
}

function isTemplateKey(v: any): v is TemplateKey {
  return typeof v === 'string' && TEMPLATE_KEYS.includes(v as TemplateKey)
}

function pickTemplateKey(v: any): TemplateKey {
  const s = typeof v === 'string' ? v.trim().toLowerCase() : ''
  return isTemplateKey(s) ? s : DEFAULT_TEMPLATE
}

function defaultBranding(): Branding {
  return {
    brandColor: DEFAULT_BRAND_COLOR,
    templateKey: DEFAULT_TEMPLATE,
    footerText: DEFAULT_FOOTER,
    logoDataUri: null,

    issuerName: DEFAULT_ISSUER_NAME,
    issuerPostalCode: DEFAULT_ISSUER_POSTAL_CODE,
    issuerAddress1: DEFAULT_ISSUER_ADDRESS1,
    issuerAddress2: DEFAULT_ISSUER_ADDRESS2,
    issuerEmail: DEFAULT_ISSUER_EMAIL,
    issuerPhone: DEFAULT_ISSUER_PHONE,
    issuerFax: DEFAULT_ISSUER_FAX,

    logoDataUrl: null,
    logoMime: null,
    logoPath: null,
  }
}

export async function loadOrgBranding(supabase: any, orgId: string): Promise<Branding> {
  const { data: settings, error: sErr } = await supabase
    .from('user_settings')
    .select(`
      logo_path,
      logo_mime,
      brand_color,
      template_key,
      footer_text,
      issuer_name,
      issuer_postal_code,
      issuer_address1,
      issuer_address2,
      issuer_email,
      issuer_phone,
      issuer_fax
    `)
    .eq('org_id', orgId)
    .maybeSingle()

  if (sErr) throw new Error(sErr.message)

  const logoPath = String((settings as any)?.logo_path ?? '')
  const logoMime = String((settings as any)?.logo_mime ?? '')

  const brandColor = pickNonEmptyString((settings as any)?.brand_color, DEFAULT_BRAND_COLOR)
  const templateKey = pickTemplateKey((settings as any)?.template_key)
  const footerText = pickNonEmptyString((settings as any)?.footer_text, DEFAULT_FOOTER)

  const issuerName = pickNonEmptyString((settings as any)?.issuer_name, DEFAULT_ISSUER_NAME)
  const issuerPostalCode = pickNonEmptyString(
    (settings as any)?.issuer_postal_code,
    DEFAULT_ISSUER_POSTAL_CODE
  )
  const issuerAddress1 = pickNonEmptyString(
    (settings as any)?.issuer_address1,
    DEFAULT_ISSUER_ADDRESS1
  )
  const issuerAddress2 = pickNonEmptyString(
    (settings as any)?.issuer_address2,
    DEFAULT_ISSUER_ADDRESS2
  )
  const issuerEmail = pickNonEmptyString((settings as any)?.issuer_email, DEFAULT_ISSUER_EMAIL)
  const issuerPhone = pickNonEmptyString((settings as any)?.issuer_phone, DEFAULT_ISSUER_PHONE)
  const issuerFax = pickNonEmptyString((settings as any)?.issuer_fax, DEFAULT_ISSUER_FAX)

  if (!logoPath) {
    return {
      brandColor,
      templateKey,
      footerText,
      logoDataUri: null,

      issuerName,
      issuerPostalCode,
      issuerAddress1,
      issuerAddress2,
      issuerEmail,
      issuerPhone,
      issuerFax,

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

      issuerName,
      issuerPostalCode,
      issuerAddress1,
      issuerAddress2,
      issuerEmail,
      issuerPhone,
      issuerFax,

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

    issuerName,
    issuerPostalCode,
    issuerAddress1,
    issuerAddress2,
    issuerEmail,
    issuerPhone,
    issuerFax,

    logoDataUrl: dataUri,
    logoMime: mime,
    logoPath,
  }
}

/**
 * 互換：userId -> current_org_id -> org branding
 */
export async function loadUserBranding(supabase: any, userId: string): Promise<Branding> {
  const orgId = await getCurrentOrgIdForUser(supabase, userId)

  if (!orgId) {
    return defaultBranding()
  }

  return loadOrgBranding(supabase, orgId)
}