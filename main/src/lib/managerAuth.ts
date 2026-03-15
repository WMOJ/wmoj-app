import { NextRequest } from 'next/server';
import { getServerSupabase, getServerSupabaseFromToken } from '@/lib/supabaseServer';

export async function getManagerSupabase(request: NextRequest) {
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    const bearerToken = authHeader?.toLowerCase().startsWith('bearer ')
        ? authHeader.substring(7).trim()
        : null;
    const supabase = bearerToken ? getServerSupabaseFromToken(bearerToken) : await getServerSupabase();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return { error: 'Unauthorized', status: 401 };

    const { data: managerRow, error: managerErr } = await supabase
        .from('managers')
        .select('id, is_active')
        .eq('id', user.id)
        .maybeSingle();

    if (managerErr) return { error: 'Authorization check failed', status: 500 };
    if (!managerRow) return { error: 'Forbidden', status: 403 };
    if (managerRow.is_active === false) return { error: 'Forbidden', status: 403 };

    return { supabase, user };
}
