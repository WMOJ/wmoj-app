import { getServerSupabase } from '@/lib/supabaseServer';
import ProblemDetailClient from './ProblemDetailClient';
import { checkTimerExpiry } from '@/utils/timerCheck';
import { getContestStatus } from '@/utils/contestStatus';
import { redirect } from 'next/navigation';

export default async function ProblemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getServerSupabase();

  const [problemResult, authResult, cpResult] = await Promise.all([
    supabase
      .from('problems')
      .select('*')
      .eq('id', id)
      .single(),
    supabase.auth.getUser(),
    supabase
      .from('contest_problems')
      .select('contest_id')
      .eq('problem_id', id),
  ]);

  const { data: problem, error } = problemResult;

  if (error || !problem) {
    return (
      <div className="bg-error/10 border border-error/20 rounded-lg p-4 max-w-6xl mx-auto mt-8">
        <p className="text-sm text-error mb-2">Failed to fetch problem or problem not found</p>
      </div>
    );
  }

  // Auth and participation check
  const { data: authUser } = authResult;
  const user = authUser?.user;

  // Determine if this problem is in any ongoing contest
  const contestIds = (cpResult.data || []).map((r: { contest_id: string }) => r.contest_id);
  let activeContestId: string | null = null;
  let isVirtualContest = true; // Default: treat as standalone

  if (contestIds.length > 0) {
    const { data: contests } = await supabase
      .from('contests')
      .select('id, is_active, starts_at, ends_at')
      .in('id', contestIds);

    const ongoingContests = (contests || []).filter(
      c => getContestStatus(c as { is_active: boolean; starts_at: string | null; ends_at: string | null }) === 'ongoing'
    );

    if (ongoingContests.length > 0) {
      isVirtualContest = false;

      if (!user) {
        redirect('/problems');
      }

      // Check if user is a participant in any of the ongoing contests
      for (const contest of ongoingContests) {
        const [participantResult, timerResult] = await Promise.all([
          supabase
            .from('contest_participants')
            .select('user_id')
            .eq('user_id', user.id)
            .eq('contest_id', contest.id)
            .maybeSingle(),
          checkTimerExpiry(supabase, user.id, contest.id)
        ]);

        const { data: participant } = participantResult;
        if (participant) {
          const { expired } = timerResult;
          if (expired) {
            return (
              <div className="bg-error/10 border border-error/20 rounded-lg p-4 max-w-6xl mx-auto mt-8">
                <p className="text-sm text-error mb-2">Contest time has expired</p>
              </div>
            );
          }
          activeContestId = contest.id;
          break;
        }
      }

      // User is not a participant in any ongoing contest for this problem
      if (!activeContestId) {
        redirect('/problems');
      }
    }
  }

  // Fetch best submission and comments in parallel
  const [subsResult, commentsResult] = await Promise.all([
    user
      ? supabase
          .from('submissions')
          .select('summary')
          .eq('user_id', user.id)
          .eq('problem_id', problem.id)
      : Promise.resolve({ data: null }),
    supabase
      .from('comments')
      .select('id, problem_id, user_id, parent_id, body, score, created_at, updated_at, users(username)')
      .eq('problem_id', id)
      .order('created_at', { ascending: true }),
  ]);

  let bestSummary = null;
  const { data: subs } = subsResult;
  if (subs && subs.length > 0) {
    for (const row of subs) {
      const s = row.summary as { total?: number; passed?: number; failed?: number } | null;
      if (!s) continue;
      const current = { total: Number(s.total ?? 0), passed: Number(s.passed ?? 0), failed: Number(s.failed ?? 0) };
      if (!bestSummary || current.passed > bestSummary.passed || (current.passed === bestSummary.passed && current.total > bestSummary.total)) {
        bestSummary = current;
      }
    }
  }

  const { data: rawComments } = commentsResult;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const initialComments = (rawComments || []).map((c: Record<string, unknown>) => {
    const users = c.users as { username: string } | null;
    return {
      id: c.id as string,
      problem_id: c.problem_id as string,
      user_id: c.user_id as string,
      parent_id: (c.parent_id as string) || null,
      body: c.body as string,
      score: c.score as number,
      created_at: c.created_at as string,
      updated_at: c.updated_at as string,
      username: users?.username || 'Unknown',
      avatar_url: `${supabaseUrl}/storage/v1/object/public/avatars/${c.user_id}/avatar`,
    };
  });

  return (
    <ProblemDetailClient
      problem={problem}
      activeContestId={activeContestId}
      initialBestSummary={bestSummary}
      isVirtualContest={isVirtualContest}
      initialComments={initialComments}
    />
  );
}
