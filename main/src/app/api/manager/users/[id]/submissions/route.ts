import { NextRequest, NextResponse } from 'next/server';
import { getManagerSupabase } from '@/lib/managerAuth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: targetUserId } = await params;

    const auth = await getManagerSupabase(request);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { supabase } = auth;

    const { data: targetUser, error: targetUserErr } = await supabase
      .from('users')
      .select('id, username, email')
      .eq('id', targetUserId)
      .maybeSingle();

    if (targetUserErr || !targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { data: subs, error: subsErr } = await supabase
      .from('submissions')
      .select('id, created_at, language, code, results, summary, status, problem_id')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false });

    if (subsErr) {
      console.error('Manager user submissions error:', subsErr);
      return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
    }

    const rows = subs || [];
    const problemIds = [...new Set(rows.map(s => s.problem_id).filter(Boolean))];
    const problemMap = new Map<string, string>();
    if (problemIds.length > 0) {
      const { data: problems } = await supabase
        .from('problems')
        .select('id, name')
        .in('id', problemIds);
      (problems || []).forEach(p => problemMap.set(p.id, p.name));
    }

    const submissions = rows.map((s) => {
      const summary = s.summary as { total?: number; passed?: number; failed?: number } | null;
      const total = Number(summary?.total ?? 0);
      const passed = Number(summary?.passed ?? 0);

      return {
        id: s.id,
        created_at: s.created_at,
        problem: problemMap.get(s.problem_id) || 'Unknown Problem',
        language: s.language,
        code: s.code,
        results: s.results,
        status: s.status || 'failed',
        score: total > 0 ? `${passed}/${total}` : '—',
        passed: s.status === 'passed',
      };
    });

    return NextResponse.json({
      user: { id: targetUser.id, username: targetUser.username || targetUser.email },
      submissions
    });
  } catch (e) {
    console.error('Manager user submissions route error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
