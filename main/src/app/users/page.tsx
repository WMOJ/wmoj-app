import { getServerSupabase } from '@/lib/supabaseServer';
import UsersClient from './UsersClient';

export interface UserRow {
  id: string;
  username: string;
  problems_solved: number;
}

const PAGE_SIZE = 25;

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const params = await searchParams;
  const currentPage = Math.max(1, Number(params?.page) || 1);
  const search = params?.search?.trim() || '';
  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await getServerSupabase();

  let leaderboard: UserRow[] = [];
  let totalPages = 1;
  let fetchError: string | undefined;

  try {
    let query = supabase
      .from('users')
      .select('id, username, problems_solved', { count: 'exact' })
      .eq('is_active', true)
      .order('problems_solved', { ascending: false });

    if (search) {
      query = query.ilike('username', `%${search}%`);
    }

    const { data: users, count, error } = await query.range(from, to);

    if (error) {
      fetchError = 'Failed to fetch users';
    } else {
      totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
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

  return (
    <UsersClient
      initialUsers={leaderboard}
      totalPages={totalPages}
      currentPage={currentPage}
      currentSearch={search}
      fetchError={fetchError}
    />
  );
}
