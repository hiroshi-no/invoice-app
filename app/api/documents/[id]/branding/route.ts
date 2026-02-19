export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'

const gone = () =>
  NextResponse.json(
    {
      error: 'deprecated',
      message: 'This endpoint is deprecated. Use /api/user-settings/branding/logo instead.',
    },
    { status: 410 }
  )

export async function GET() {
  return gone()
}
export async function POST() {
  return gone()
}
export async function DELETE() {
  return gone()
}
