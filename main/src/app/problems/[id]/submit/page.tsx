import { getServerSupabase } from '@/lib/supabaseServer';
import SubmitClient from './SubmitClient';
import { checkTimerExpiry } from '@/utils/timerCheck';
import { redirect } from 'next/navigation';

export default async function SubmitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getServerSupabase();

  const [problemResult, authResult] = await Promise.all([
    supabase.from('problems').select('*').eq('id', id).single(),
    supabase.auth.getUser(),
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

  if (problem.contest) {
    const [participantResult, timerResult] = await Promise.all([
      supabase
        .from('contest_participants')
        .select('user_id')
        .eq('user_id', user.id)
        .eq('contest_id', problem.contest)
        .maybeSingle(),
      checkTimerExpiry(supabase, user.id, problem.contest),
    ]);

    const { data: participant } = participantResult;
    if (!participant) {
      redirect('/problems');
    }

    const { expired } = timerResult;
    if (expired) {
      return (
        <div className="bg-error/10 border border-error/20 rounded-lg p-4 max-w-6xl mx-auto mt-8">
          <p className="text-sm text-error">Contest time has expired</p>
        </div>
      );
    }
  }

  return <SubmitClient problem={problem} />;
}
