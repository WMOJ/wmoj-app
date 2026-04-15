import { NextRequest, NextResponse } from 'next/server';
import { getManagerSupabase } from '@/lib/managerAuth';
import { validateSlug } from '@/utils/validation';
import { getContestStatus } from '@/utils/contestStatus';

export async function POST(request: NextRequest) {
  try {
    const { id, name, description, length, starts_at, ends_at, is_rated, problem_ids } = await request.json();

    const slugError = validateSlug(id, 'Contest');
    if (slugError) {
      return NextResponse.json({ error: slugError }, { status: 400 });
    }

    if (!name || !description || !length) {
      return NextResponse.json(
        { error: 'Name, description, and length are required' },
        { status: 400 }
      );
    }

    if (length < 1 || length > 1440) {
      return NextResponse.json(
        { error: 'Length must be between 1 and 1440 minutes' },
        { status: 400 }
      );
    }

    if (starts_at && ends_at && new Date(starts_at) >= new Date(ends_at)) {
      return NextResponse.json(
        { error: 'Start date/time must be before end date/time' },
        { status: 400 }
      );
    }

    const auth = await getManagerSupabase(request);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { supabase, user } = auth;

    // Check uniqueness of contest ID
    const { data: existing } = await supabase.from('contests').select('id').eq('id', id).maybeSingle();
    if (existing) {
      return NextResponse.json({ error: 'A contest with this ID already exists' }, { status: 409 });
    }

    const { data, error } = await supabase
      .from('contests')
      .insert([
        {
          id,
          name,
          description,
          length,
          is_active: true,
          created_by: user.id,
          starts_at: starts_at || null,
          ends_at: ends_at || null,
          is_rated: is_rated ?? false
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to create contest' },
        { status: 500 }
      );
    }

    // Assign selected problems to this contest via junction table
    if (Array.isArray(problem_ids) && problem_ids.length > 0) {
      // Validate problem eligibility
      const { data: cpRows } = await supabase
        .from('contest_problems')
        .select('problem_id, contest_id')
        .in('problem_id', problem_ids);

      if (cpRows && cpRows.length > 0) {
        const contestIdsInUse = [...new Set(cpRows.map(r => r.contest_id))];
        const { data: contestsInUse } = await supabase
          .from('contests')
          .select('id, is_active, is_rated, starts_at, ends_at')
          .in('id', contestIdsInUse);

        // Rule 1: Block problems in rated non-virtual contests
        const ratedNonVirtualIds = new Set(
          (contestsInUse || [])
            .filter(c => {
              if (!c.is_rated) return false;
              const status = getContestStatus(c as { is_active: boolean; starts_at: string | null; ends_at: string | null });
              return status === 'ongoing' || status === 'upcoming';
            })
            .map(c => c.id)
        );
        const blockedByRule1 = cpRows.filter(r => ratedNonVirtualIds.has(r.contest_id)).map(r => r.problem_id);
        if (blockedByRule1.length > 0) {
          return NextResponse.json({ error: 'Some problems are in a rated ongoing/upcoming contest and cannot be added' }, { status: 400 });
        }

        // Rule 2: If this contest is rated, block problems in ANY other contest
        if (is_rated) {
          const inOtherContest = cpRows.map(r => r.problem_id);
          if (inOtherContest.length > 0) {
            return NextResponse.json({ error: 'Rated contests can only include standalone problems not already in another contest' }, { status: 400 });
          }
        }
      }

      const rows = problem_ids.map((pid: string) => ({ contest_id: id, problem_id: pid }));
      const { error: cpError } = await supabase
        .from('contest_problems')
        .insert(rows);

      if (cpError) {
        console.error('Problem assignment error:', cpError);
      }
    }

    return NextResponse.json(
      {
        success: true,
        contest: data,
        message: 'Contest created successfully'
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create contest error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
