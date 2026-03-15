import { NextRequest, NextResponse } from 'next/server';
import { getManagerSupabase } from '@/lib/managerAuth';

export async function GET(request: NextRequest) {
  const auth = await getManagerSupabase(request);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { supabase } = auth;
  const { data, error } = await supabase
    .from('contests')
    .select('id,name,length,is_active,updated_at,created_at');
  if (error) {
    console.error('List contests error:', error);
    return NextResponse.json({ error: 'Failed to fetch contests' }, { status: 500 });
  }
  return NextResponse.json({ contests: data || [] });
}
