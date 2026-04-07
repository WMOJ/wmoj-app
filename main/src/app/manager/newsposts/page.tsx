import { redirect } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabaseServer';
import ManagerNewsPostsClient from './ManagerNewsPostsClient';

export default async function ManagerNewsPostsPage() {
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

  const { data: postsData } = await supabase
    .from('news_posts')
    .select('id, title, date_posted, updated_at, users!uid(username)')
    .order('date_posted', { ascending: false });

  const posts = (postsData || []).map((p: Record<string, unknown>) => {
    const usersField = p.users as { username: string } | { username: string }[] | null;
    const username = Array.isArray(usersField)
      ? usersField[0]?.username ?? 'Unknown'
      : usersField?.username ?? 'Unknown';
    return {
      id: p.id as string,
      title: p.title as string,
      date_posted: p.date_posted as string,
      updated_at: p.updated_at as string | null,
      author: username,
    };
  });

  return <ManagerNewsPostsClient initialPosts={posts} />;
}
