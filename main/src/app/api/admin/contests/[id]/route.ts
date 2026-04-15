import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase, getServerSupabaseFromToken } from '@/lib/supabaseServer';
import { getContestStatus } from '@/utils/contestStatus';

async function getAdminSupabase(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  const bearerToken = authHeader?.toLowerCase().startsWith('bearer ')
    ? authHeader.substring(7).trim()
    : null;
  const supabase = bearerToken ? getServerSupabaseFromToken(bearerToken) : await getServerSupabase();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { error: 'Unauthorized', status: 401 };
  const { data: adminRow, error: adminErr } = await supabase
    .from('admins')
    .select('id, is_active')
    .eq('id', user.id)
    .maybeSingle();
  if (adminErr) return { error: 'Authorization check failed', status: 500 };
  if (!adminRow || adminRow.is_active === false) return { error: 'Forbidden', status: 403 };
  return { supabase, user };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await getAdminSupabase(request);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { supabase } = auth;
  const { data, error } = await supabase
    .from('contests')
    .select('id,name,description,length,is_active,created_at,updated_at,starts_at,ends_at,is_rated')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    console.error('Fetch admin contest error:', error);
    return NextResponse.json({ error: 'Failed to fetch contest' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ contest: data });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await getAdminSupabase(request);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { supabase } = auth;

  const { data: existing } = await supabase.from('contests').select('is_active, is_rated').eq('id', id).maybeSingle();
  if (existing?.is_active) return NextResponse.json({ error: 'Cannot edit an activated contest' }, { status: 403 });

  const body = await request.json();
  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.description !== undefined) updates.description = body.description;
  if (body.length !== undefined) updates.length = body.length;
  if (body.starts_at !== undefined) updates.starts_at = body.starts_at || null;
  if (body.ends_at !== undefined) updates.ends_at = body.ends_at || null;
  if (body.is_rated !== undefined) updates.is_rated = !!body.is_rated;
  if (Object.keys(updates).length === 0 && body.problem_ids === undefined) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  let data = null;
  if (Object.keys(updates).length > 0) {
    const result = await supabase
      .from('contests')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (result.error) {
      console.error('Update contest error:', result.error);
      return NextResponse.json({ error: 'Failed to update contest' }, { status: 500 });
    }
    data = result.data;
  }

  // Update problem assignments via junction table
  if (Array.isArray(body.problem_ids)) {
    const problemIds: string[] = body.problem_ids;

    // Get current assignments
    const { data: current } = await supabase
      .from('contest_problems')
      .select('problem_id')
      .eq('contest_id', id);
    const currentIds = (current || []).map((r: { problem_id: string }) => r.problem_id);

    // Remove problems no longer in the selection
    const toRemove = currentIds.filter((pid: string) => !problemIds.includes(pid));
    if (toRemove.length > 0) {
      await supabase
        .from('contest_problems')
        .delete()
        .eq('contest_id', id)
        .in('problem_id', toRemove);
    }

    // Add newly selected problems
    const currentSet = new Set(currentIds);
    const toAdd = problemIds.filter(pid => !currentSet.has(pid));
    if (toAdd.length > 0) {
      // Validate eligibility of newly added problems
      const { data: cpRows } = await supabase
        .from('contest_problems')
        .select('problem_id, contest_id')
        .in('problem_id', toAdd);

      if (cpRows && cpRows.length > 0) {
        const contestIdsInUse = [...new Set(cpRows.map(r => r.contest_id))];
        const { data: contestsInUse } = await supabase
          .from('contests')
          .select('id, is_active, is_rated, starts_at, ends_at')
          .in('id', contestIdsInUse);

        const ratedNonVirtualIds = new Set(
          (contestsInUse || [])
            .filter(c => {
              if (!c.is_rated) return false;
              const status = getContestStatus(c as { is_active: boolean; starts_at: string | null; ends_at: string | null });
              return status === 'ongoing' || status === 'upcoming';
            })
            .map(c => c.id)
        );
        const blockedByRule1 = cpRows.filter(r => ratedNonVirtualIds.has(r.contest_id));
        if (blockedByRule1.length > 0) {
          return NextResponse.json({ error: 'Some problems are in a rated ongoing/upcoming contest and cannot be added' }, { status: 400 });
        }

        // Rule 2: If this contest is rated, block problems already in any other contest
        const contestIsRated = body.is_rated !== undefined ? !!body.is_rated : !!existing?.is_rated;
        if (contestIsRated) {
          return NextResponse.json({ error: 'Rated contests can only include standalone problems not already in another contest' }, { status: 400 });
        }
      }

      const rows = toAdd.map(pid => ({ contest_id: id, problem_id: pid }));
      await supabase.from('contest_problems').insert(rows);
    }
  }

  return NextResponse.json({ contest: data });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await getAdminSupabase(request);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { supabase } = auth;

  const { data: existing } = await supabase.from('contests').select('is_active').eq('id', id).maybeSingle();
  if (existing?.is_active) return NextResponse.json({ error: 'Cannot delete an activated contest' }, { status: 403 });

  // ON DELETE CASCADE on contest_problems handles cleanup automatically
  const { error } = await supabase
    .from('contests')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Delete contest error:', error);
    return NextResponse.json({ error: 'Failed to delete contest' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
