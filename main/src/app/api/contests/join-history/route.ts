import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/requestAuth';
import { rejoinState } from '@/lib/contestTimer';
import { getContestStatus } from '@/utils/contestStatus';

export async function GET(request: Request) {
  try {
    const auth = await requireUser(request);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const { supabase, userId } = auth;

    const { data, error } = await supabase
      .from('join_history')
      .select('contest_id, is_virtual, joined_at, contests(length, is_active, starts_at, ends_at)')
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

    // Ongoing contests this user left with time still on their clock: the UI
    // offers "Rejoin" for these instead of "Spectate". Same rule as
    // `POST /join`, from the same function, so the button and the route agree.
    const nowMs = Date.now();
    const rejoinable_contest_ids = rows
      .filter((row) => {
        const contest = row.contests;
        if (!row.contest_id || !contest || getContestStatus(contest) !== 'ongoing') return false;
        return rejoinState(row, contest.length, nowMs).kind === 'rejoin';
      })
      .map((row) => row.contest_id as string);

    return NextResponse.json({ contest_ids, virtual_contest_ids, rejoinable_contest_ids });
  } catch (e) {
    console.error('join-history error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
