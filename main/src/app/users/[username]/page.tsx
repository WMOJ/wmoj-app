import { getServerSupabase } from '@/lib/supabaseServer';
import UserProfileClient from './UserProfileClient';
import type { HeatmapDay } from '@/components/SubmissionHeatmap';

interface ProfileData {
  id: string;
  username: string;
  created_at: string;
  about_me: string | null;
  problems_solved: number;
  points: number;
  contests_written: number;
  avatarUrl: string;
}

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await getServerSupabase();

  // Fetch user profile
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, username, created_at, about_me, problems_solved, points')
    .eq('username', username)
    .eq('is_active', true)
    .maybeSingle();

  if (userError || !user) {
    return (
      <div className="max-w-5xl mx-auto py-12">
        <div className="glass-panel p-8 text-center">
          <h1 className="text-xl font-semibold text-foreground mb-2">User Not Found</h1>
          <p className="text-sm text-text-muted">The user you are looking for does not exist or has been deactivated.</p>
        </div>
      </div>
    );
  }

  // Fetch all submission timestamps for this user
  const { data: submissions } = await supabase
    .from('submissions')
    .select('created_at')
    .eq('user_id', user.id);

  // Group by date
  const countMap = new Map<string, number>();
  if (submissions) {
    for (const sub of submissions) {
      const date = new Date(sub.created_at).toISOString().split('T')[0];
      countMap.set(date, (countMap.get(date) || 0) + 1);
    }
  }

  const heatmapData: HeatmapDay[] = Array.from(countMap.entries()).map(([date, count]) => ({
    date,
    count,
  }));

  // Count distinct contests the user has joined
  const { count: contestsWritten } = await supabase
    .from('join_history')
    .select('contest_id', { count: 'exact', head: true })
    .eq('user_id', user.id);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const avatarUrl = `${supabaseUrl}/storage/v1/object/public/avatars/${user.id}/avatar`;

  const profileData: ProfileData = {
    id: user.id,
    username: user.username,
    created_at: user.created_at,
    about_me: user.about_me,
    problems_solved: user.problems_solved ?? 0,
    points: user.points ?? 0,
    contests_written: contestsWritten ?? 0,
    avatarUrl,
  };

  return (
    <UserProfileClient
      profile={profileData}
      heatmapData={heatmapData}
    />
  );
}
