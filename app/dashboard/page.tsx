import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) redirect('/login')

  // ✅ 個人専用：ロゴ設定の有無だけ確認（任意）
  const { data: settings } = await supabase
    .from('user_settings')
    .select('logo_path')
    .eq('user_id', userData.user.id)
    .maybeSingle()

  const hasLogo = !!settings?.logo_path
  const year = new Date().getFullYear()

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 16px' }}>
      <h1>ダッシュボード</h1>
      <p>User: {userData.user.email}</p>

      {/* ✅ Branding（個人専用） */}
      <div style={{ marginTop: 12, padding: 12, border: '1px solid #eee', borderRadius: 8 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>ブランディング</div>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
          {hasLogo ? 'ロゴ設定済み' : 'ロゴ未設定'}
        </div>
        <Link href="/settings/branding">ロゴ設定へ</Link>
      </div>

      {/* ✅ 月次集計への導線（既存維持） */}
      <div style={{ marginTop: 12, padding: 12, border: '1px solid #eee', borderRadius: 8 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>集計</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/dashboard/monthly">月次集計</Link>
          <Link href={`/dashboard/monthly?year=${year - 1}`}>月次集計（{year - 1}）</Link>
        </div>
      </div>
    </main>
  )
}