import { redirect } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabaseServer';
import EditContestClient from './EditContestClient';

export default async function EditContestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getServerSupabase();

  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id;
  if (!userId) redirect('/auth/login');

  const { data: adminRow } = await supabase
    .from('admins')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (!adminRow) redirect('/');

  const { data: contestData, error: contestError } = await supabase
    .from('contests')
    .select('id,name,description,length,is_active,created_at,updated_at,starts_at,ends_at,is_rated')
    .eq('id', id)
    .maybeSingle();

  if (contestError || !contestData) {
    redirect('/admin/contests/manage');
  }

  return <EditContestClient contest={contestData} />;
}
