import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase, getServerSupabaseFromToken } from '@/lib/supabaseServer';
import { checkTimerExpiry } from '@/utils/timerCheck';
import { getContestStatus } from '@/utils/contestStatus';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Problem ID is required' },
        { status: 400 }
      );
    }

    // Build supabase client; prefer bearer if provided for participation checks
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    const bearer = authHeader?.toLowerCase().startsWith('bearer ')
      ? authHeader.substring(7).trim()
      : null;
    const supabase = bearer ? getServerSupabaseFromToken(bearer) : await getServerSupabase();

    const { data: problem, error } = await supabase
      .from('problems')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching problem:', error);
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Problem not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to fetch problem' },
        { status: 500 }
      );
    }

    // Check if problem belongs to any ongoing contest
    const { data: cpRows } = await supabase
      .from('contest_problems')
      .select('contest_id')
      .eq('problem_id', id);

    const contestIds = (cpRows || []).map((r: { contest_id: string }) => r.contest_id);

    if (contestIds.length > 0) {
      const { data: contests } = await supabase
        .from('contests')
        .select('id, is_active, starts_at, ends_at')
        .in('id', contestIds);

      const ongoingContests = (contests || []).filter(
        c => getContestStatus(c as { is_active: boolean; starts_at: string | null; ends_at: string | null }) === 'ongoing'
      );

      if (ongoingContests.length > 0) {
        // Anonymous or no token → forbid
        if (!bearer) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        const { data: authUser, error: userErr } = await supabase.auth.getUser();
        const userId = authUser?.user?.id;
        if (userErr || !userId) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Check participation in any ongoing contest
        let hasAccess = false;
        for (const contest of ongoingContests) {
          const { data: participant } = await supabase
            .from('contest_participants')
            .select('user_id')
            .eq('user_id', userId)
            .eq('contest_id', contest.id)
            .maybeSingle();

          if (participant) {
            const { expired } = await checkTimerExpiry(supabase, userId, contest.id);
            if (expired) {
              return NextResponse.json({ error: 'Contest time has expired' }, { status: 403 });
            }
            hasAccess = true;
            break;
          }
        }

        if (!hasAccess) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      }
    }

    return NextResponse.json({ problem });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
