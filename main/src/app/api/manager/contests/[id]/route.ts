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
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }
  const { data, error } = await supabase
    .from('contests')
    .update(updates)
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) {
    console.error('Update contest error:', error);
    return NextResponse.json({ error: 'Failed to update contest' }, { status: 500 });
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
