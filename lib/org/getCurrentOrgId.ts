// lib/org/getCurrentOrgId.ts
export async function getCurrentOrgId(supabase: any, userId: string): Promise<string> {
  const { data, error } = await supabase
    .from('profiles')
    .select('current_org_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data?.current_org_id) throw new Error('current_org_id not found (profiles.current_org_id)')

  return String(data.current_org_id)
}

// 互換（もし既存で getCurrentOrgIdFromProfiles を使ってる箇所があっても壊さない）
export const getCurrentOrgIdFromProfiles = getCurrentOrgId