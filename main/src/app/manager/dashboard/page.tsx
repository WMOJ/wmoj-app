import { redirect } from 'next/navigation';
import ManagerDashboardClient from './ManagerDashboardClient';
import { getServerSupabase } from '@/lib/supabaseServer';

export default async function ManagerDashboardPage() {
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

  const { data: subs, error: subsErr } = await supabase
    .from('submissions')
    .select('id, created_at, language, code, results, summary, status, problem_id, user_id')
    .order('created_at', { ascending: false });

  if (subsErr) {
    console.error('Manager recent submissions error:', subsErr);
  }

  const rows = subs || [];

  const problemIds = [...new Set(rows.map((s: any) => s.problem_id).filter(Boolean))];
  const userIds = [...new Set(rows.map((s: any) => s.user_id).filter(Boolean))];

  const problemMap = new Map<string, string>();
  const userMap = new Map<string, string>();

  const [problemsRes, usersRes] = await Promise.all([
    problemIds.length > 0
      ? supabase.from('problems').select('id, name').in('id', problemIds)
      : Promise.resolve({ data: [] }),
    userIds.length > 0
      ? supabase.from('users').select('id, username, email').in('id', userIds)
      : Promise.resolve({ data: [] })
  ]);

  (problemsRes.data || []).forEach((p: any) => problemMap.set(p.id, p.name));
  (usersRes.data || []).forEach((u: any) => userMap.set(u.id, u.username || u.email || 'Unknown User'));

  const submissions = rows.map((s: any) => {
    const summary = s.summary as { total?: number; passed?: number; failed?: number } | null;
    const total = Number(summary?.total ?? 0);
    const passed = Number(summary?.passed ?? 0);

    return {
      id: s.id,
      timestamp: s.created_at,
      user: userMap.get(s.user_id) || 'Unknown User',
      problem: problemMap.get(s.problem_id) || 'Unknown Problem',
      language: s.language,
      code: s.code || '',
      results: s.results as any || null,
      status: s.status || 'failed',
      score: total > 0 ? `${passed}/${total}` : '—',
      passed: s.status === 'passed',
    };
  });

  return <ManagerDashboardClient initialSubmissions={submissions} />;
}
