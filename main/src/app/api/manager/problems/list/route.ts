import { NextRequest, NextResponse } from 'next/server';
import { getManagerSupabase } from '@/lib/managerAuth';

export async function GET(request: NextRequest) {
  const auth = await getManagerSupabase(request);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { supabase } = auth;
  const { data, error } = await supabase
    .from('problems')
    .select('id,name,contest,is_active,updated_at,created_at');
  if (error) {
    console.error('List problems error:', error);
    return NextResponse.json({ error: 'Failed to fetch problems' }, { status: 500 });
  }
  const problems = data || [];
  const contestIds = Array.from(
    new Set(
      problems
        .map(p => p.contest)
        .filter((id: string | null): id is string => !!id)
    )
  );

  let contestNameMap: Record<string, string> = {};
  if (contestIds.length > 0) {
    const { data: contestsData, error: contestsErr } = await supabase
      .from('contests')
      .select('id,name')
      .in('id', contestIds);
    if (contestsErr) {
      console.error('Fetch contest names error:', contestsErr);
    } else if (contestsData) {
      contestNameMap = contestsData.reduce((acc: Record<string, string>, c: { id: string; name: string }) => {
        acc[c.id] = c.name;
        return acc;
      }, {});
    }
  }

  const enriched = problems.map(p => ({
    ...p,
    contest_name: p.contest ? (contestNameMap[p.contest] || p.contest) : null,
  }));

  return NextResponse.json({ problems: enriched });
}
