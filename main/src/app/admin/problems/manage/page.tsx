import { redirect } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabaseServer';
import ManageProblemsClient from './ManageProblemsClient';

export default async function ManageProblemsPage() {
  const supabase = await getServerSupabase();

  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id;
  if (!userId) redirect('/auth/login');

  const { data: adminRow } = await supabase
    .from('admins')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (!adminRow) redirect('/');

  const { data: problemsData } = await supabase
    .from('problems')
    .select('id,name,is_active,updated_at,created_at,points')
    .eq('created_by', userId);

  const problems = problemsData || [];

  // Fetch contest associations from junction table
  const problemIds = problems.map(p => p.id);
  let problemContestNamesMap: Record<string, string[]> = {};

  if (problemIds.length > 0) {
    const { data: cpRows } = await supabase
      .from('contest_problems')
      .select('problem_id, contest_id')
      .in('problem_id', problemIds);

    const contestIdSet = new Set<string>();
    const problemContestMap: Record<string, string[]> = {};
    for (const row of cpRows || []) {
      contestIdSet.add(row.contest_id);
      if (!problemContestMap[row.problem_id]) problemContestMap[row.problem_id] = [];
      problemContestMap[row.problem_id].push(row.contest_id);
    }

    if (contestIdSet.size > 0) {
      const { data: contestsData } = await supabase
        .from('contests')
        .select('id,name')
        .in('id', Array.from(contestIdSet));
      const contestNameMap = (contestsData || []).reduce((acc: Record<string, string>, c: { id: string; name: string }) => {
        acc[c.id] = c.name;
        return acc;
      }, {});

      for (const [pid, cids] of Object.entries(problemContestMap)) {
        problemContestNamesMap[pid] = cids.map(cid => contestNameMap[cid] || cid);
      }
    }
  }

  const enrichedProblems = problems.map(p => ({
    ...p,
    contest_names: problemContestNamesMap[p.id] || [],
  }));

  return (
    <ManageProblemsClient
      initialProblems={enrichedProblems}
    />
  );
}
