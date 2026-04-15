import { getServerSupabase } from '@/lib/supabaseServer';
import SubmitClient from './SubmitClient';
import { checkTimerExpiry } from '@/utils/timerCheck';
import { getContestStatus } from '@/utils/contestStatus';
import { redirect } from 'next/navigation';

export default async function SubmitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getServerSupabase();

  const [problemResult, authResult, cpResult] = await Promise.all([
    supabase.from('problems').select('*').eq('id', id).single(),
    supabase.auth.getUser(),
    supabase.from('contest_problems').select('contest_id').eq('problem_id', id),
  ]);

  const { data: problem, error } = problemResult;

  if (error || !problem) {
    return (
      <div className="bg-error/10 border border-error/20 rounded-lg p-4 max-w-6xl mx-auto mt-8">
        <p className="text-sm text-error">Failed to fetch problem or problem not found</p>
      </div>
    );
  }

  const { data: authUser } = authResult;
  const user = authUser?.user;

  if (!user) {
    redirect('/auth/login');
  }

  // Determine if this problem is in any ongoing contest
  const contestIds = (cpResult.data || []).map((r: { contest_id: string }) => r.contest_id);
  let activeContestId: string | null = null;
  let isVirtualContest = true;

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

      for (const contest of ongoingContests) {
        const [participantResult, timerResult] = await Promise.all([
          supabase
            .from('contest_participants')
            .select('user_id')
            .eq('user_id', user.id)
            .eq('contest_id', contest.id)
            .maybeSingle(),
          checkTimerExpiry(supabase, user.id, contest.id),
        ]);

        const { data: participant } = participantResult;
        if (participant) {
          const { expired } = timerResult;
          if (expired) {
            return (
              <div className="bg-error/10 border border-error/20 rounded-lg p-4 max-w-6xl mx-auto mt-8">
                <p className="text-sm text-error">Contest time has expired</p>
              </div>
            );
          }
          activeContestId = contest.id;
          break;
        }
      }

      if (!activeContestId) {
        redirect('/problems');
      }
    }
  }

  return <SubmitClient problem={problem} activeContestId={activeContestId} isVirtualContest={isVirtualContest} />;
}
