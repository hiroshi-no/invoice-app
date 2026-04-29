import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  /**
   * 本番では封印
   * Vercel Preview でも NODE_ENV=production になることがあるため、
   * Previewでも使いたい場合は VERCEL_ENV 判定に変更する。
   */
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse('Not Found', { status: 404 })
  }

  return NextResponse.json({
    ok: true,
    env: {
      hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      hasSupabaseAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      hasSupabasePublishableKey: Boolean(
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
      ),
      hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      hasStripeSecretKey: Boolean(process.env.STRIPE_SECRET_KEY),
      hasStripeWebhookSecret: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
      hasStarterPrice: Boolean(process.env.STRIPE_PRICE_STARTER_MONTHLY),
      hasStandardPrice: Boolean(process.env.STRIPE_PRICE_STANDARD_MONTHLY),
    },
  })
}