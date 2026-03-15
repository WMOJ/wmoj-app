import { NextRequest, NextResponse } from 'next/server';
import { getManagerSupabase } from '@/lib/managerAuth';

export async function GET(request: NextRequest) {
  try {
    const auth = await getManagerSupabase(request);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { supabase } = auth;

    const { data: subs, error: subsErr } = await supabase
      .from('submissions')
      .select('id, created_at, language, code, results, summary, status, problem_id, user_id')
      .order('created_at', { ascending: false });

    if (subsErr) {
      console.error('Manager recent submissions error:', subsErr);
      return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
    }

    const rows = subs || [];
    const problemIds = [...new Set(rows.map(s => s.problem_id).filter(Boolean))];
    const userIds = [...new Set(rows.map(s => s.user_id).filter(Boolean))];

    const problemMap = new Map<string, string>();
    if (problemIds.length > 0) {
      const { data: problems } = await supabase
        .from('problems')
        .select('id, name')
        .in('id', problemIds);
      (problems || []).forEach(p => problemMap.set(p.id, p.name));
    }

    const userMap = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, username, email')
        .in('id', userIds);
      (users || []).forEach(u => userMap.set(u.id, u.username || u.email || 'Unknown User'));
    }

    const submissions = rows.map((s) => {
      const summary = s.summary as { total?: number; passed?: number; failed?: number } | null;
      const total = Number(summary?.total ?? 0);
      const passed = Number(summary?.passed ?? 0);

      return {
        id: s.id,
        created_at: s.created_at,
        user: userMap.get(s.user_id) || 'Unknown User',
        problem: problemMap.get(s.problem_id) || 'Unknown Problem',
        language: s.language,
        code: s.code,
        results: s.results,
        status: s.status || 'failed',
        score: total > 0 ? `${passed}/${total}` : '—',
        passed: s.status === 'passed',
      };
    });

    return NextResponse.json({ submissions });
  } catch (e) {
    console.error('Manager activity route error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
