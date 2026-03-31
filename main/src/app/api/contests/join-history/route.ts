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

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = authData.user.id;

    const { data, error } = await supabase
      .from('join_history')
      .select('contest_id, is_virtual')
      .eq('user_id', userId);

    if (error) {
      console.error('join-history fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch join history' }, { status: 500 });
    }

    const rows = data || [];

    const contest_ids = rows
      .map(row => row.contest_id)
      .filter((id: string | null): id is string => !!id);

    // Compute which contests have ONLY virtual joins (all rows for that contest are is_virtual=true)
    // Used by the UI to show "Rejoin" instead of "Spectate"
    const contestJoinMap = new Map<string, boolean[]>();
    for (const row of rows) {
      if (!row.contest_id) continue;
      if (!contestJoinMap.has(row.contest_id)) {
        contestJoinMap.set(row.contest_id, []);
      }
      contestJoinMap.get(row.contest_id)!.push(row.is_virtual);
    }

    const virtual_contest_ids = Array.from(contestJoinMap.entries())
      .filter(([, flags]) => flags.every(f => f === true))
      .map(([id]) => id);

    return NextResponse.json({ contest_ids, virtual_contest_ids });
  } catch (e) {
    console.error('join-history error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
