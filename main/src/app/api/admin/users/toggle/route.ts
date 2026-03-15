import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
