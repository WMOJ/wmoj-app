import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase, getServerSupabaseFromToken } from '@/lib/supabaseServer';
import { validateSlug } from '@/utils/validation';

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

    // Try header bearer token first, fallback to cookie based session
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    const bearerToken = authHeader?.toLowerCase().startsWith('bearer ')
      ? authHeader.substring(7).trim()
      : null;

    const supabase = bearerToken
      ? getServerSupabaseFromToken(bearerToken)
      : await getServerSupabase();

    // Current user
    const { data: userResp, error: userErr } = await supabase.auth.getUser();
    const authUser = userResp?.user;
    if (userErr || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin membership
    const { data: adminRow, error: adminErr } = await supabase
      .from('admins')
      .select('id, is_active')
      .eq('id', authUser.id)
      .maybeSingle();

    if (adminErr) {
      console.error('Admin lookup error:', adminErr);
      return NextResponse.json({ error: 'Authorization check failed' }, { status: 500 });
    }
    if (!adminRow || adminRow.is_active === false) {
      return NextResponse.json({ error: 'Forbidden: admin access required' }, { status: 403 });
    }

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
          is_active: false,
          created_by: authUser.id,
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
