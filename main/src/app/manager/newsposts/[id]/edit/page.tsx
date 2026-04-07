import { redirect } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabaseServer';
import ManagerEditNewsPostClient from './ManagerEditNewsPostClient';

export default async function ManagerEditNewsPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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

  const { data: post, error } = await supabase
    .from('news_posts')
    .select('id, title, content, date_posted, updated_at')
    .eq('id', id)
    .maybeSingle();

  if (error || !post) redirect('/manager/newsposts');

  return <ManagerEditNewsPostClient post={post} />;
}
