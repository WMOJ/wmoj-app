import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/adminAuth';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim();
    const rawExclude = searchParams.get('exclude_contest')?.trim() || null;
    const excludeContest = rawExclude && UUID_RE.test(rawExclude) ? rawExclude : null;

    if (!q || q.length < 1) {
      return NextResponse.json({ problems: [] });
    }

    const auth = await getAdminSupabase(request);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { supabase, user } = auth;

    let query = supabase
      .from('problems')
      .select('id, name, points, difficulty')
      .eq('created_by', user.id)
      .ilike('name', `%${q}%`)
      .limit(20);

    if (excludeContest) {
      query = query.or(`contest.is.null,contest.eq.${excludeContest}`);
    } else {
      query = query.is('contest', null);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Admin problem search error:', error);
      return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }

    return NextResponse.json({ problems: data ?? [] });
  } catch (error) {
    console.error('Admin problem search error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
