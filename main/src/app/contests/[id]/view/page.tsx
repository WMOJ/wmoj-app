import { getServerSupabase } from '@/lib/supabaseServer';
import ContestViewClient from './ContestViewClient';

export default async function ContestViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getServerSupabase();

  const { data: contestData, error } = await supabase
    .from('contests')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !contestData) {
    return <ContestViewClient error="Failed to load contest or inactive" />;
  }

  // Fetch problems belonging to this contest via junction table
  const { data: cpRows } = await supabase
    .from('contest_problems')
    .select('problem_id, problems(id, name, points, is_active, created_at)')
    .eq('contest_id', id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const problems = (cpRows || [])
    .map((row: any) => {
      const p = Array.isArray(row.problems) ? row.problems[0] : row.problems;
      return { id: p.id, name: p.name, points: p.points, is_active: p.is_active, created_at: p.created_at };
    })
    .filter((p: { is_active: boolean }) => p.is_active)
    .sort((a: { created_at: string }, b: { created_at: string }) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return <ContestViewClient initialContest={contestData} problems={problems || []} />;
}
