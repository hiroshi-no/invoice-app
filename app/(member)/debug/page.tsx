import { notFound } from 'next/navigation'
import DebugClient from './DebugClient'

export default function DebugPage() {
  // ✅ 本番だけ封印（Previewで使いたければ VERCEL_ENV を使う）
  if (process.env.VERCEL_ENV === 'production') notFound()

  return <DebugClient />
}