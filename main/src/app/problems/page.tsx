import { getServerSupabase } from '@/lib/supabaseServer';
import ProblemsClient from './ProblemsClient';
import { Problem } from '@/types/problem';

export type HotProblem = Problem & { submission_count: number };

export default async function ProblemsPage() {
  const supabase = await getServerSupabase();
  const { data: problems, error } = await supabase
    .from('problems')
    .select('*')
    .is('contest', null)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div className="bg-error/10 border border-error/20 rounded-lg p-4 max-w-6xl mx-auto mt-8">
        <p className="text-sm text-error mb-2">Failed to fetch problems</p>
      </div>
    );
  }

  const problemList = (problems as Problem[]) || [];
  const problemIds = problemList.map(p => p.id);
  
  // Aggregate submission counts
  let submissionCounts: Record<string, number> = {};
  if (problemIds.length > 0) {
    const { data: submissions } = await supabase
      .from('submissions')
      .select('problem_id')
      .in('problem_id', problemIds);
    
    if (submissions) {
      submissionCounts = submissions.reduce((acc: Record<string, number>, s) => {
        const pid = s.problem_id as string;
        if (pid) acc[pid] = (acc[pid] || 0) + 1;
        return acc;
      }, {});
    }
  }

  // Determine hot problems
  const hotProblems: HotProblem[] = problemList
    .map(p => ({
      ...p,
      submission_count: submissionCounts[p.id] || 0
    }))
    .sort((a, b) => b.submission_count - a.submission_count)
    .slice(0, 5);

  return <ProblemsClient initialProblems={problemList} hotProblems={hotProblems} />;
}
