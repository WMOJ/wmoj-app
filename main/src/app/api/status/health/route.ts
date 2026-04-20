import { NextResponse } from 'next/server';
import { getJudgeSharedSecret } from '@/lib/env';

export async function GET() {
  const JUDGE_URL = process.env.NEXT_PUBLIC_JUDGE_URL || 'http://localhost:4001';
  try {
    const res = await fetch(`${JUDGE_URL}/health`, {
      cache: 'no-store',
      headers: { 'X-Judge-Token': getJudgeSharedSecret() },
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json({ status: 'online', ...data });
    }
    return NextResponse.json({ status: 'offline' }, { status: 502 });
  } catch {
    return NextResponse.json({ status: 'offline' }, { status: 502 });
  }
}
