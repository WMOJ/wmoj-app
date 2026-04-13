import { getServerSupabase } from '@/lib/supabaseServer';
import ProblemsClient from './ProblemsClient';
import { Problem } from '@/types/problem';

export type HotProblem = Problem & { submission_count: number };

const PAGE_SIZE = 20;

export default async function ProblemsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const currentPage = Math.max(1, Number(params?.page) || 1);
  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await getServerSupabase();

  // Fetch IDs of virtual contests (ended + active, or no time window)
  const isoNow = new Date().toISOString();
  const { data: virtualContestsWithEnd } = await supabase
    .from('contests')
    .select('id')
    .eq('is_active', true)
    .lt('ends_at', isoNow);
  const { data: virtualContestsNoWindow } = await supabase
    .from('contests')
    .select('id')
    .eq('is_active', true)
    .is('starts_at', null)
    .is('ends_at', null);
  const virtualIds = [
    ...(virtualContestsWithEnd || []).map(c => c.id),
    ...(virtualContestsNoWindow || []).map(c => c.id),
  ];

  const orFilter = virtualIds.length > 0
    ? `contest.is.null,contest.in.(${virtualIds.join(',')})`
    : 'contest.is.null';

  const { data: problems, count, error } = await supabase
    .from('problems')
    .select('*', { count: 'exact' })
    .or(orFilter)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    return (
      <div className="bg-error/10 border border-error/20 rounded-lg p-4 max-w-6xl mx-auto mt-8">
        <p className="text-sm text-error mb-2">Failed to fetch problems</p>
      </div>
    );
  }

  const problemList = (problems as Problem[]) || [];
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  // Hot problems: computed from all submissions (lightweight single-column fetch)
  const { data: allSubs } = await supabase
    .from('submissions')
    .select('problem_id')
    .not('problem_id', 'is', null);

  const countMap: Record<string, number> = {};
  for (const s of allSubs || []) {
    const pid = s.problem_id as string;
    if (pid) countMap[pid] = (countMap[pid] || 0) + 1;
  }

  const topIds = Object.entries(countMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);

  let hotProblems: HotProblem[] = [];
  if (topIds.length > 0) {
    const { data: hotData } = await supabase
      .from('problems')
      .select('*')
      .in('id', topIds)
      .or(orFilter)
      .eq('is_active', true);
    hotProblems = (hotData || [])
      .map(p => ({ ...p, submission_count: countMap[p.id] || 0 }))
      .sort((a, b) => b.submission_count - a.submission_count);
  }

  return (
    <ProblemsClient
      initialProblems={problemList}
      hotProblems={hotProblems}
      totalPages={totalPages}
      currentPage={currentPage}
    />
  );
}
