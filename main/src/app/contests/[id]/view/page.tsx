import { getServerSupabase } from '@/lib/supabaseServer';
import { notFound } from 'next/navigation';
import ContestViewClient from './ContestViewClient';
import { canUserAccessContest } from '@/lib/contestAccess';
import { CONTEST_DETAIL_COLUMNS } from '@/lib/queries/contests';
import { readRejoinState, type RejoinState } from '@/lib/contestTimer';

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

  // Whether this visit is a first join, a return to a run the user left, or a
  // run whose time is used up — the same rule `POST /join` enforces, decided
  // here so the button never offers what the route will refuse.
  const userId = authUser?.user?.id;
  const rejoin: RejoinState = userId
    ? await readRejoinState(supabase, userId, id, contestData.length)
    : { kind: 'fresh' };

  return <ContestViewClient initialContest={contestData} problems={problems || []} rejoin={rejoin} />;
}
