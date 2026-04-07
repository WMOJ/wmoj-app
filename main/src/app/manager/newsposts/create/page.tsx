import { redirect } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabaseServer';
import ManagerCreateNewsPostClient from './ManagerCreateNewsPostClient';

export default async function ManagerCreateNewsPostPage() {
  const supabase = await getServerSupabase();

  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id;
  if (!userId) redirect('/auth/login');

  const { data: managerRow } = await supabase
    .from('managers')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (!managerRow) redirect('/');

  return <ManagerCreateNewsPostClient />;
}
