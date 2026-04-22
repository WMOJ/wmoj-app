import type { SupabaseClient } from '@supabase/supabase-js';

export async function canUserAccessProblem(
  supabase: SupabaseClient,
  problem: { is_active: boolean | null; created_by: string | null },
  userId: string | null,
): Promise<boolean> {
  if (problem.is_active === true) return true;
  if (!userId) return false;

  const { data: managerRow } = await supabase
    .from('managers')
    .select('id')
    .eq('id', userId)
    .maybeSingle();
  if (managerRow) return true;

  if (problem.created_by === userId) {
    const { data: adminRow } = await supabase
      .from('admins')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
    if (adminRow) return true;
  }

  return false;
}
