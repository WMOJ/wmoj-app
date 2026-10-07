import { getServerSupabase } from '@/lib/supabaseServer';
import { notFound } from 'next/navigation';
import ContestViewClient from './ContestViewClient';
import { canUserAccessContest } from '@/lib/contestAccess';
import { CONTEST_DETAIL_COLUMNS } from '@/lib/queries/contests';

interface EmbeddedProblem {
  id: string;
  name: string;
  points: number;
}

export default async function ContestViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getServerSupabase();

  const [contestResult, authResult] = await Promise.all([
    supabase
      .from('contests')
      .select(CONTEST_DETAIL_COLUMNS)
      .eq('id', id)
      .maybeSingle(),
    supabase.auth.getUser(),
  ]);

  const { data: contestData, error } = contestResult;
  if (error || !contestData) {
    notFound();
  }

  const { data: authUser } = authResult;
  const hasAccess = await canUserAccessContest(supabase, contestData, authUser?.user?.id ?? null);
  if (!hasAccess) {
    notFound();
  }

  // Fetch problems belonging to this contest via junction table. The is_active
  // filter runs in the database, matching the other four contest problem lists.
  // Ordered as /contests/[id] orders them: by when each was added to this contest.
  const { data: cpRows, error: cpErr } = await supabase
    .from('contest_problems')
    .select('problem_id, problems!inner(id, name, points, is_active)')
    .eq('contest_id', id)
    .eq('problems.is_active', true)
    .order('created_at', { ascending: true })
    .order('problem_id', { ascending: true });

  if (cpErr) {
    console.error('[ContestViewPage] contest problems fetch error:', cpErr);
  }

  const problems = (cpRows || [])
    .map((row) => (Array.isArray(row.problems) ? row.problems[0] : row.problems))
    .filter((p): p is EmbeddedProblem => !!p)
    .map((p) => ({ id: p.id, name: p.name, points: p.points }));

  return <ContestViewClient initialContest={contestData} problems={problems || []} />;
}
