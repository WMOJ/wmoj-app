import { NextRequest, NextResponse } from 'next/server';
import { getManagerSupabase } from '@/lib/managerAuth';
import { validateSlug } from '@/utils/validation';

export async function POST(request: NextRequest) {
  try {
    const { id, name, content, contest, input, output, timeLimit, memoryLimit, difficulty } = await request.json();

    const slugError = validateSlug(id, 'Problem');
    if (slugError) {
      return NextResponse.json({ error: slugError }, { status: 400 });
    }

    if (!name || !content || !input || !output) {
      return NextResponse.json(
        { error: 'Name, content, input, and output are required' },
        { status: 400 }
      );
    }

    if (!Array.isArray(input) || !Array.isArray(output)) {
      return NextResponse.json(
        { error: 'Input and output must be arrays' },
        { status: 400 }
      );
    }

    if (input.length !== output.length) {
      return NextResponse.json(
        { error: 'Input and output arrays must have the same length' },
        { status: 400 }
      );
    }

    if (input.length === 0) {
      return NextResponse.json(
        { error: 'At least one test case is required' },
        { status: 400 }
      );
    }

    if (timeLimit !== undefined && (typeof timeLimit !== 'number' || isNaN(timeLimit) || timeLimit <= 0)) {
      return NextResponse.json(
        { error: 'Time limit must be a positive number' },
        { status: 400 }
      );
    }

    if (memoryLimit !== undefined && (typeof memoryLimit !== 'number' || isNaN(memoryLimit) || memoryLimit <= 0)) {
      return NextResponse.json(
        { error: 'Memory limit must be a positive number' },
        { status: 400 }
      );
    }

    const auth = await getManagerSupabase(request);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { supabase, user } = auth;

    // Check uniqueness of problem ID
    const { data: existing } = await supabase.from('problems').select('id').eq('id', id).maybeSingle();
    if (existing) {
      return NextResponse.json({ error: 'A problem with this ID already exists' }, { status: 409 });
    }

    const { data, error } = await supabase
      .from('problems')
      .insert([
        {
          id,
          name,
          content,
          contest: contest || null,
          input,
          output,
          time_limit: timeLimit || 5000,
          memory_limit: memoryLimit || 256,
          difficulty: difficulty || 'Easy',
          created_by: user.id
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to create problem' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        problem: data,
        message: 'Problem created successfully'
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create problem error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
