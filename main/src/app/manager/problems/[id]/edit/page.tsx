import { redirect } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabaseServer';
import ManagerEditProblemClient from './ManagerEditProblemClient';

export default async function ManagerEditProblemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getServerSupabase();

  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id;
  if (!userId) redirect('/auth/login');

  const { data: managerRow } = await supabase
    .from('managers')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (!managerRow) redirect('/dashboard');

  const [{ data: problemData, error: problemError }, { data: contestsData }] = await Promise.all([
    supabase
      .from('problems')
      .select('id,name,content,contest,is_active,time_limit,memory_limit,difficulty,input,output,created_at,updated_at')
      .eq('id', id)
      .maybeSingle(),
    supabase.from('contests').select('id,name'),
  ]);

  if (problemError || !problemData) {
    redirect('/manager/problems/manage');
  }

  const { input: _input, output: _output, ...rest } = problemData;
  const testCaseCount = Array.isArray(_input) ? _input.length : 0;
  const contests = contestsData || [];

  return (
    <ManagerEditProblemClient
      problem={{ ...rest, test_case_count: testCaseCount }}
      initialContests={contests}
    />
  );
}
