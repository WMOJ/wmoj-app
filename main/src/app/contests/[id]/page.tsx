import { getServerSupabase } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import ContestDetailClient from './ContestDetailClient';
import type { Contest } from '@/types/contest';

export default async function ContestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getServerSupabase();
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id;

  if (!userId) {
    redirect('/contests');
  }

  // Check participation and load data concurrently
  const [partResult, contestResult, cpResult] = await Promise.all([
    supabase
      .from('contest_participants')
      .select('user_id')
      .eq('user_id', userId)
      .eq('contest_id', id)
      .maybeSingle(),
    supabase
      .from('contests')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .maybeSingle(),
    supabase
      .from('contest_problems')
      .select('problem_id, problems(id, name, created_at)')
      .eq('contest_id', id),
  ]);

  const { data: participationData } = partResult;
  if (!participationData) {
    redirect('/contests');
  }

  const { data: contestData, error: contestError } = contestResult;
  if (contestError || !contestData) {
    return <ContestDetailClient id={id} error="Failed to load contest or inactive" />;
  }

  const contest = contestData as Contest;

  // Extract problems from junction table result
  const cpRows = cpResult.data || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const problems = cpRows
    .map((row: any) => {
      const p = Array.isArray(row.problems) ? row.problems[0] : row.problems;
      return { id: p.id as string, name: p.name as string, created_at: p.created_at as string };
    })
    .sort((a: { created_at: string }, b: { created_at: string }) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

  return (
    <ContestDetailClient
      id={id}
      initialContest={contest}
      initialProblems={problems}
    />
  );
}
