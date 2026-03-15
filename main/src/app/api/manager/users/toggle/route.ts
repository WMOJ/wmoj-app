import { NextRequest, NextResponse } from 'next/server';
import { getManagerSupabase } from '@/lib/managerAuth';

export async function POST(request: NextRequest) {
  try {
    const auth = await getManagerSupabase(request);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { supabase } = auth;

    const body = await request.json().catch(() => null);
    const userId: string | undefined = body?.userId;
    const is_active: boolean | undefined = body?.is_active;
    if (!userId || typeof is_active !== 'boolean') {
      return NextResponse.json({ error: 'userId and is_active required' }, { status: 400 });
    }

    const { error: updateErr } = await supabase
      .from('users')
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (updateErr) {
      console.error('Toggle user error:', updateErr);
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Manager users toggle error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
