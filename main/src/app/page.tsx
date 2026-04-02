import { getServerSupabase } from '@/lib/supabaseServer';
import DashboardClient from './DashboardClient';
import { getContestStatus } from '@/utils/contestStatus';

export interface NewsPost {
  id: string;
  title: string;
  content: string;
  date_posted: string;
  users: { username: string } | { username: string }[];
}

export interface CompactContest {
  id: string;
  name: string;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
}

export interface CompactProblem {
  id: string;
  name: string;
  difficulty: string;
  created_at: string;
}

export default async function HomePage() {
  const supabase = await getServerSupabase();

  let initialNewsPosts: NewsPost[] = [];
  let ongoingContests: CompactContest[] = [];
  let upcomingContests: CompactContest[] = [];
  let recentProblems: CompactProblem[] = [];

  const [newsResult, contestsResult, problemsResult] = await Promise.all([
    supabase
      .from('news_posts')
      .select('id, title, content, date_posted, users!inner(username)')
      .order('date_posted', { ascending: false })
      .limit(10),
    supabase
      .from('contests')
      .select('id, name, starts_at, ends_at, is_active')
      .eq('is_active', true),
    supabase
      .from('problems')
      .select('id, name, difficulty, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(5)
  ]);

  if (!newsResult.error && newsResult.data) {
    initialNewsPosts = newsResult.data as unknown as NewsPost[];
  }

  if (!problemsResult.error && problemsResult.data) {
    recentProblems = problemsResult.data as unknown as CompactProblem[];
  }

  if (!contestsResult.error && contestsResult.data) {
    const allActive = contestsResult.data as unknown as CompactContest[];
    allActive.forEach(c => {
      const status = getContestStatus(c);
      if (status === 'ongoing') ongoingContests.push(c);
      if (status === 'upcoming') upcomingContests.push(c);
    });

    // Sort ongoing by ends_at ascending (ending soonest first)
    ongoingContests.sort((a, b) => {
      if (!a.ends_at) return 1;
      if (!b.ends_at) return -1;
      return new Date(a.ends_at).getTime() - new Date(b.ends_at).getTime();
    });

    // Sort upcoming by starts_at ascending (starting soonest first)
    upcomingContests.sort((a, b) => {
      if (!a.starts_at) return 1;
      if (!b.starts_at) return -1;
      return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
    });

    // Limit to 5
    ongoingContests = ongoingContests.slice(0, 5);
    upcomingContests = upcomingContests.slice(0, 5);
  }

  return (
    <DashboardClient 
      initialNewsPosts={initialNewsPosts} 
      ongoingContests={ongoingContests}
      upcomingContests={upcomingContests}
      recentProblems={recentProblems}
    />
  );
}
