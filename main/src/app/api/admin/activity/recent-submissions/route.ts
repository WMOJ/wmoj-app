import { NextResponse } from 'next/server';
import { getServerSupabaseFromToken } from '@/lib/supabaseServer';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const accessToken = authHeader.split(' ')[1];
    const supabase = getServerSupabaseFromToken(accessToken);

    // Verify user is admin
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const adminId = authData.user.id;

    const { data: adminRow, error: adminErr } = await supabase
      .from('admins')
      .select('id')
      .eq('id', adminId)
      .maybeSingle();
    if (adminErr || !adminRow) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch admin's own problem IDs
    const { data: ownProblems, error: problemsErr } = await supabase
      .from('problems')
      .select('id, name')
      .eq('created_by', adminId);

    if (problemsErr) {
      console.error('Admin problems fetch error:', problemsErr);
      return NextResponse.json({ error: 'Failed to fetch problems' }, { status: 500 });
    }

    const ownProblemIds = (ownProblems || []).map(p => p.id);
    const problemMap = new Map<string, string>(
      (ownProblems || []).map(p => [p.id, p.name])
    );

    if (ownProblemIds.length === 0) {
      return NextResponse.json({ submissions: [] });
    }

    const { data: subs, error: subsErr } = await supabase
      .from('submissions')
      .select('id, created_at, language, code, results, summary, status, problem_id, user_id')
      .in('problem_id', ownProblemIds)
      .order('created_at', { ascending: false });

    if (subsErr) {
      console.error('Admin recent submissions error:', subsErr);
      return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
    }

    const rows = subs || [];

    // Fetch user names
    const userIds = [...new Set(rows.map(s => s.user_id).filter(Boolean))];
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
    console.error('Admin activity route error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
