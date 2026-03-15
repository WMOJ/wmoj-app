import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseFromToken } from '@/lib/supabaseServer';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const supabase = await getServerSupabaseFromToken(token);

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Check if user exists in managers table
    const { data: managerData, error: managerError } = await supabase
      .from('managers')
      .select('id')
      .eq('id', user.id)
      .single();

    if (managerError || !managerData) {
      return NextResponse.json(
        { error: 'User is not a manager' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        isManager: true,
        userId: user.id
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Manager check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
