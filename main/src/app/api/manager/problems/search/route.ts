import { NextRequest, NextResponse } from 'next/server';
import { getManagerSupabase } from '@/lib/managerAuth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim();
    const excludeContest = searchParams.get('exclude_contest')?.trim() || null;

    if (!q || q.length < 1) {
      return NextResponse.json({ problems: [] });
    }

    const auth = await getManagerSupabase(request);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { supabase } = auth;

    // If editing a contest, exclude problems already assigned to it
    let excludedIds: string[] = [];
    if (excludeContest) {
      const { data: alreadyIn } = await supabase
        .from('contest_problems')
        .select('problem_id')
        .eq('contest_id', excludeContest);
      excludedIds = (alreadyIn || []).map((r: { problem_id: string }) => r.problem_id);
    }

    let query = supabase
      .from('problems')
      .select('id, name, points')
      .ilike('name', `%${q}%`)
      .limit(20);

    if (excludedIds.length > 0) {
      query = query.not('id', 'in', `(${excludedIds.join(',')})`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Manager problem search error:', error);
      return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }

    return NextResponse.json({ problems: data ?? [] });
  } catch (error) {
    console.error('Manager problem search error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
