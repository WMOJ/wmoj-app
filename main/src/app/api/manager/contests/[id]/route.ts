import { NextRequest, NextResponse } from 'next/server';
import { getManagerSupabase } from '@/lib/managerAuth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await getManagerSupabase(request);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { supabase } = auth;
  const { data, error } = await supabase
    .from('contests')
    .select('id, name, description, length, is_active, created_at, updated_at, starts_at, ends_at, is_rated')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    console.error('Fetch manager contest error:', error);
    return NextResponse.json({ error: 'Failed to fetch contest' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ contest: data });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await getManagerSupabase(request);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { supabase } = auth;
  const body = await request.json();
  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.description !== undefined) updates.description = body.description;
  if (body.length !== undefined) updates.length = body.length;
  if (body.is_active !== undefined) updates.is_active = !!body.is_active;
  if (body.starts_at !== undefined) updates.starts_at = body.starts_at || null;
  if (body.ends_at !== undefined) updates.ends_at = body.ends_at || null;
  if (body.is_rated !== undefined) updates.is_rated = !!body.is_rated;
  if (Object.keys(updates).length === 0 && body.problem_ids === undefined) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  let data = null;
  if (Object.keys(updates).length > 0) {
    const result = await supabase
      .from('contests')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (result.error) {
      console.error('Update contest error:', result.error);
      return NextResponse.json({ error: 'Failed to update contest' }, { status: 500 });
    }
    data = result.data;
  }

  // Update problem assignments if problem_ids is provided
  if (Array.isArray(body.problem_ids)) {
    const problemIds: string[] = body.problem_ids;

    // Release problems no longer in the selection
    if (problemIds.length > 0) {
      await supabase
        .from('problems')
        .update({ contest: null })
        .eq('contest', id)
        .not('id', 'in', `(${problemIds.join(',')})`);
    } else {
      await supabase
        .from('problems')
        .update({ contest: null })
        .eq('contest', id);
    }

    // Claim newly selected standalone problems
    if (problemIds.length > 0) {
      await supabase
        .from('problems')
        .update({ contest: id })
        .in('id', problemIds)
        .is('contest', null);
    }
  }

  return NextResponse.json({ contest: data });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await getManagerSupabase(request);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { supabase } = auth;

  const { error: problemUpdateError } = await supabase
    .from('problems')
    .update({ contest: null })
    .eq('contest', id);

  if (problemUpdateError) {
    console.error('Decouple problems error:', problemUpdateError);
    return NextResponse.json({ error: 'Failed to decouple problems from contest' }, { status: 500 });
  }

  const { error } = await supabase
    .from('contests')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Delete contest error:', error);
    return NextResponse.json({ error: 'Failed to delete contest' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
