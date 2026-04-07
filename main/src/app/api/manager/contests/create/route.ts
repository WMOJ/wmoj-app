import { NextRequest, NextResponse } from 'next/server';
import { getManagerSupabase } from '@/lib/managerAuth';
import { validateSlug } from '@/utils/validation';

export async function POST(request: NextRequest) {
  try {
    const { id, name, description, length, starts_at, ends_at, is_rated } = await request.json();

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
