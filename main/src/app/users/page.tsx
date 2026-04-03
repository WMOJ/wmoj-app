import { getServerSupabase } from '@/lib/supabaseServer';
import UsersClient from './UsersClient';

interface UserRow {
  id: string;
  username: string;
  problems_solved: number;
}

export default async function UsersPage() {
  const supabase = await getServerSupabase();

  let leaderboard: UserRow[] = [];
  let fetchError: string | undefined;

  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, problems_solved')
      .eq('is_active', true)
      .order('problems_solved', { ascending: false });

    if (error) {
      fetchError = 'Failed to fetch users';
    } else {
      leaderboard = (users || []).map((u) => ({
        id: u.id,
        username: u.username || 'Unknown',
        problems_solved: u.problems_solved ?? 0,
      }));
    }
  } catch (err) {
    console.error('[UsersPage] Error fetching data:', err);
    fetchError = 'Failed to fetch users';
  }

  return <UsersClient initialUsers={leaderboard} fetchError={fetchError} />;
}
