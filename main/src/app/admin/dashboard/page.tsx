import { redirect } from 'next/navigation';
import AdminDashboardClient from './AdminDashboardClient';
import { getServerSupabase } from '@/lib/supabaseServer';

export default async function AdminDashboardPage() {
  const supabase = await getServerSupabase();

  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id;
  if (!userId) redirect('/auth/login');

  const { data: adminRow } = await supabase
    .from('admins')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (!adminRow) redirect('/dashboard');

  // Fetch only this admin's problems
  const { data: myProblems } = await supabase
    .from('problems')
    .select('id, name')
    .eq('created_by', userId);

  const myProblemIds = (myProblems || []).map((p: any) => p.id);
  const problemNameMap = new Map<string, string>(
    (myProblems || []).map((p: any) => [p.id, p.name])
  );

  if (myProblemIds.length === 0) {
    return <AdminDashboardClient initialSubmissions={[]} />;
  }

  const { data: subs, error: subsErr } = await supabase
    .from('submissions')
    .select('id, created_at, language, code, results, summary, status, problem_id, user_id')
    .in('problem_id', myProblemIds)
    .order('created_at', { ascending: false });

  if (subsErr) {
    console.error('Admin recent submissions error:', subsErr);
  }

  const rows = subs || [];

  const userIds = [...new Set(rows.map((s: any) => s.user_id).filter(Boolean))];
  const userMap = new Map<string, string>();

  if (userIds.length > 0) {
    const { data: usersData } = await supabase
      .from('users')
      .select('id, username, email')
      .in('id', userIds);
    (usersData || []).forEach((u: any) =>
      userMap.set(u.id, u.username || u.email || 'Unknown User')
    );
  }

  const submissions = rows.map((s: any) => {
    const summary = s.summary as { total?: number; passed?: number; failed?: number } | null;
    const total = Number(summary?.total ?? 0);
    const passed = Number(summary?.passed ?? 0);

    return {
      id: s.id,
      timestamp: s.created_at,
      user: userMap.get(s.user_id) || 'Unknown User',
      problem: problemNameMap.get(s.problem_id) || 'Unknown Problem',
      language: s.language,
      code: s.code || '',
      results: s.results as any || null,
      status: s.status || 'failed',
      score: total > 0 ? `${passed}/${total}` : '—',
      passed: s.status === 'passed',
    };
  });

  return <AdminDashboardClient initialSubmissions={submissions} />;
}
