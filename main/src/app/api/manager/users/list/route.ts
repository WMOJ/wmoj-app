import { NextRequest, NextResponse } from 'next/server';
import { getManagerSupabase } from '@/lib/managerAuth';

export async function GET(request: NextRequest) {
  try {
    const auth = await getManagerSupabase(request);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { supabase } = auth;

    const { data: users, error: usersErr } = await supabase
      .from('users')
      .select('id, username, email, is_active, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (usersErr) {
      console.error('List users error:', usersErr);
      return NextResponse.json({ error: 'Failed to list users' }, { status: 500 });
    }

    return NextResponse.json({ users: users || [] });
  } catch (e) {
    console.error('Manager users list error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
