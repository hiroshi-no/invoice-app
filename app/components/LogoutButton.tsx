'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/browser'

export function LogoutButton() {
  const router = useRouter()
  const supabase = createClient()

  const onLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button onClick={onLogout} style={{ padding: '8px 12px' }}>
      Sign out
    </button>
  )
}

// ✅ 追加：default export も用意（どっちのimportでも動く）
export default LogoutButton
