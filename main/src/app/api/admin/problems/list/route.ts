import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase, getServerSupabaseFromToken } from '@/lib/supabaseServer';

async function getAdminSupabase(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  const bearerToken = authHeader?.toLowerCase().startsWith('bearer ')
    ? authHeader.substring(7).trim()
    : null;
  const supabase = bearerToken ? getServerSupabaseFromToken(bearerToken) : await getServerSupabase();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { error: 'Unauthorized', status: 401 };
  const { data: adminRow, error: adminErr } = await supabase
    .from('admins')
    .select('id, is_active')
    .eq('id', user.id)
    .maybeSingle();
  if (adminErr) return { error: 'Authorization check failed', status: 500 };
  if (!adminRow || adminRow.is_active === false) return { error: 'Forbidden', status: 403 };
  return { supabase, user };
}

export async function GET(request: NextRequest) {
  const auth = await getAdminSupabase(request);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { supabase, user } = auth;
  const { data, error } = await supabase
    .from('problems')
    .select('id,name,is_active,updated_at,created_at')
    .eq('created_by', user.id);
  if (error) {
    console.error('List problems error:', error);
    return NextResponse.json({ error: 'Failed to fetch problems' }, { status: 500 });
  }
  const problems = data || [];

  // Fetch contest associations from junction table
  const problemIds = problems.map(p => p.id);
  let contestNameMap: Record<string, string> = {};
  let problemContestNamesMap: Record<string, string[]> = {};

  if (problemIds.length > 0) {
    const { data: cpRows } = await supabase
      .from('contest_problems')
      .select('problem_id, contest_id')
      .in('problem_id', problemIds);

    const contestIdSet = new Set<string>();
    const problemContestMap: Record<string, string[]> = {};
    for (const row of cpRows || []) {
      contestIdSet.add(row.contest_id);
      if (!problemContestMap[row.problem_id]) problemContestMap[row.problem_id] = [];
      problemContestMap[row.problem_id].push(row.contest_id);
    }

    if (contestIdSet.size > 0) {
      const { data: contestsData } = await supabase
        .from('contests')
        .select('id,name')
        .in('id', Array.from(contestIdSet));
      contestNameMap = (contestsData || []).reduce((acc: Record<string, string>, c: { id: string; name: string }) => {
        acc[c.id] = c.name;
        return acc;
      }, {});
    }

    for (const [pid, cids] of Object.entries(problemContestMap)) {
      problemContestNamesMap[pid] = cids.map(cid => contestNameMap[cid] || cid);
    }
  }

  const enriched = problems.map(p => ({
    ...p,
    contest_names: problemContestNamesMap[p.id] || [],
  }));

  return NextResponse.json({ problems: enriched });
}
