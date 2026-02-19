export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      deprecated: true,
      message: 'Deprecated endpoint. Use /api/user-settings/branding/logo and /api/user-settings/branding/logo/image',
    },
    { status: 410 }
  )
}

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      deprecated: true,
      message: 'Deprecated endpoint. Use /api/user-settings/branding/logo',
    },
    { status: 410 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    {
      ok: false,
      deprecated: true,
      message: 'Deprecated endpoint. Use /api/user-settings/branding/logo',
    },
    { status: 410 }
  )
}
