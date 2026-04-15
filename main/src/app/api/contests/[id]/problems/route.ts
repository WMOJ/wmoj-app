import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabaseServer';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await getServerSupabase();
    if (!id) return NextResponse.json({ error: 'contest id required' }, { status: 400 });

    // Only return problems for active contests
    const { data: contest, error: contestErr } = await supabase
      .from('contests')
      .select('id,is_active')
      .eq('id', id)
      .maybeSingle();
    if (contestErr) return NextResponse.json({ error: 'Failed to load contest' }, { status: 500 });
    if (!contest || !contest.is_active) return NextResponse.json({ error: 'Contest inactive' }, { status: 403 });

    // Fetch problems via junction table
    const { data: cpRows, error } = await supabase
      .from('contest_problems')
      .select('problem_id, problems(id, name, content, created_at)')
      .eq('contest_id', id);

    if (error) return NextResponse.json({ error: 'Failed to load problems' }, { status: 500 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const problems = (cpRows || [])
      .map((row: any) => {
        const p = Array.isArray(row.problems) ? row.problems[0] : row.problems;
        return { id: p.id, name: p.name, content: p.content, created_at: p.created_at };
      })
      .sort((a: { created_at: string }, b: { created_at: string }) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return NextResponse.json({ problems });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
