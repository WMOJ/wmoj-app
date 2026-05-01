import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const email = typeof body?.email === 'string' ? body.email.trim() : '';
    const username = typeof body?.username === 'string' ? body.username.trim() : '';

    if (!email && !username) {
      return NextResponse.json({ error: 'email or username required' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabasePublishableKey);

    const [emailResult, usernameResult] = await Promise.all([
      email
        ? supabase.rpc('is_email_registered', { p_email: email })
        : Promise.resolve({ data: false, error: null }),
      username
        ? supabase.rpc('is_username_taken', { p_username: username })
        : Promise.resolve({ data: false, error: null }),
    ]);

    if (emailResult.error || usernameResult.error) {
      console.error('check-availability rpc error', emailResult.error, usernameResult.error);
      return NextResponse.json({ error: 'lookup failed' }, { status: 500 });
    }

    return NextResponse.json({
      emailRegistered: Boolean(emailResult.data),
      usernameTaken: Boolean(usernameResult.data),
    });
  } catch (e) {
    console.error('check-availability error', e);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
