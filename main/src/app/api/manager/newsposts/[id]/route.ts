import { NextRequest, NextResponse } from 'next/server';
import { getManagerSupabase } from '@/lib/managerAuth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await getManagerSupabase(request);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { supabase } = auth;

  const { data, error } = await supabase
    .from('news_posts')
    .select('id, title, content, date_posted, updated_at, users!uid(username)')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Fetch news post error:', error);
    return NextResponse.json({ error: 'Failed to fetch news post' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ post: data });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await getManagerSupabase(request);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { supabase } = auth;

  const body = await request.json();
  const updates: Record<string, unknown> = {};
  if (body.title !== undefined) updates.title = body.title;
  if (body.content !== undefined) updates.content = body.content;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('news_posts')
    .update(updates)
    .eq('id', id)
    .select('id, title, content, date_posted, updated_at')
    .maybeSingle();

  if (error) {
    console.error('Update news post error:', error);
    return NextResponse.json({ error: 'Failed to update news post' }, { status: 500 });
  }

  return NextResponse.json({ post: data });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await getManagerSupabase(request);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { supabase } = auth;

  const { error } = await supabase.from('news_posts').delete().eq('id', id);

  if (error) {
    console.error('Delete news post error:', error);
    return NextResponse.json({ error: 'Failed to delete news post' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
