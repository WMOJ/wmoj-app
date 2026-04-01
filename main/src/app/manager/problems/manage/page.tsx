import { redirect } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabaseServer';
import ManagerManageProblemsClient from './ManagerManageProblemsClient';

export default async function ManagerManageProblemsPage() {
  const supabase = await getServerSupabase();

  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id;
  if (!userId) redirect('/auth/login');

  const { data: managerRow } = await supabase
    .from('managers')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (!managerRow) redirect('/');

  const [
    { data: contestsData },
    { data: problemsData }
  ] = await Promise.all([
    supabase.from('contests').select('id,name'),
    supabase.from('problems').select('id,name,contest,is_active,updated_at,created_at')
  ]);

  const contests = contestsData || [];
  const problems = problemsData || [];

  let contestNameMap: Record<string, string> = {};
  if (contests.length > 0) {
    contestNameMap = contests.reduce((acc: Record<string, string>, c: { id: string; name: string }) => {
      acc[c.id] = c.name;
      return acc;
    }, {});
  }

  const enrichedProblems = problems.map(p => ({
    ...p,
    contest_name: p.contest ? (contestNameMap[p.contest] || p.contest) : null,
  }));

  return (
    <ManagerManageProblemsClient
      initialProblems={enrichedProblems}
      initialContests={contests}
    />
  );
}
