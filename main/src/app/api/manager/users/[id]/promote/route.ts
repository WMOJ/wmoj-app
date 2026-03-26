import { NextRequest, NextResponse } from 'next/server';
import { getManagerSupabase } from '@/lib/managerAuth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: targetUserId } = await params;

    const auth = await getManagerSupabase(request);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { supabase } = auth;

    const body = await request.json().catch(() => null);
    if (typeof body?.promote !== 'boolean') {
      return NextResponse.json({ error: 'promote boolean required' }, { status: 400 });
    }
    const { promote } = body;

    if (promote) {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('admins')
        .upsert({ id: targetUserId, is_active: true, created_at: now, updated_at: now, last_login: now });
      if (error) {
        console.error('Promote error:', error);
        return NextResponse.json({ error: 'Failed to promote user' }, { status: 500 });
      }
    } else {
      const { error } = await supabase
        .from('admins')
        .delete()
        .eq('id', targetUserId);
      if (error) {
        console.error('Demote error:', error);
        return NextResponse.json({ error: 'Failed to demote user' }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true, isAdmin: promote });
  } catch (e) {
    console.error('Manager promote route error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
