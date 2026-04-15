import { getServerSupabase } from '@/lib/supabaseServer';
import ContestViewClient from './ContestViewClient';

export default async function ContestViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getServerSupabase();

  const { data: contestData, error } = await supabase
    .from('contests')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !contestData) {
    return <ContestViewClient error="Failed to load contest or inactive" />;
  }

  // Fetch problems belonging to this contest
  const { data: problems } = await supabase
    .from('problems')
    .select('id,name,points')
    .eq('contest', id)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  return <ContestViewClient initialContest={contestData} problems={problems || []} />;
}
