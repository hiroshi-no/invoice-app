// lib/pdf/branding.ts
import { createClient as createSupabaseJsClient } from '@supabase/supabase-js'

export type Branding = {
  templateKey: 'classic' | 'minimal'
  brandColor: string
  footerText: string
  logoDataUri: string | null
}

function getSupabaseUrl() {
  return process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
}

function getServiceRoleClient() {
  const url = getSupabaseUrl()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!url || !key) return null
  return createSupabaseJsClient(url, key, { auth: { persistSession: false } })
}

export async function loadUserBranding(userSupabase: any, userId: string): Promise<Branding> {
  const out: Branding = {
    templateKey: 'classic',
    brandColor: '#111827',
    footerText: '',
    logoDataUri: null,
  }

  const { data: settings, error } = await userSupabase
    .from('user_settings')
    .select('logo_path, logo_mime')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.warn('[branding] user_settings load failed:', error.message)
    return out
  }

  const logoPath = String((settings as any)?.logo_path ?? '')
  const logoMime = String((settings as any)?.logo_mime ?? '')
  if (!logoPath || !logoMime) return out

  try {
    const sr = getServiceRoleClient()
    if (!sr) return out

    const { data: blob, error: dlErr } = await sr.storage.from('branding').download(logoPath)
    if (dlErr || !blob) {
      console.warn('[branding] logo download failed:', dlErr?.message ?? 'no blob', 'path=', logoPath)
      return out
    }
    const ab = await blob.arrayBuffer()
    const base64 = Buffer.from(ab).toString('base64')
    out.logoDataUri = `data:${logoMime};base64,${base64}`
    return out
  } catch (e: any) {
    console.warn('[branding] logo encode failed:', e?.message ?? e)
    return out
  }
}
