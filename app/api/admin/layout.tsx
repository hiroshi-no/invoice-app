import { redirect } from 'next/navigation'
import { getAdminContext } from '@/lib/authz/getAdminContext'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const ctx = await getAdminContext()

  if (!ctx.ok) {
    redirect('/documents')
  }

  return <>{children}</>
}