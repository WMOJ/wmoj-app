import { NextRequest, NextResponse } from 'next/server';
import { getManagerSupabase } from '@/lib/managerAuth';
import { getJudgeSharedSecret } from '@/lib/env';

export async function POST(request: NextRequest) {
  try {
    const auth = await getManagerSupabase(request);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await request.json();
    const source = body?.code;
    if (!source || typeof source !== 'string' || source.trim().length === 0) {
      return NextResponse.json({ error: 'code field is required' }, { status: 400 });
    }

    const JUDGE_URL = process.env.NEXT_PUBLIC_JUDGE_URL || 'http://localhost:4001';
    const resp = await fetch(`${JUDGE_URL}/generate-tests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Judge-Token': getJudgeSharedSecret(),
      },
      body: JSON.stringify({ language: 'cpp', code: source }),
    });
    const data = await resp.json();

    if (!resp.ok) {
      return NextResponse.json(
        { error: data?.error || 'Judge error', inputRaw: data?.inputJson, outputRaw: data?.outputJson },
        { status: resp.status || 500 }
      );
    }

    return NextResponse.json({
      input: data?.input,
      output: data?.output,
      inputRaw: data?.inputJson,
      outputRaw: data?.outputJson,
    });
  } catch (error) {
    console.error('Generator generate error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
