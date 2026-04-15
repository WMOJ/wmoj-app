import { supabase } from '@/lib/supabase';

export async function checkContestParticipation(userId: string, contestId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('contest_participants')
      .select('user_id')
      .eq('user_id', userId)
      .eq('contest_id', contestId)
      .maybeSingle();

    if (error) {
      console.error('Error checking contest participation:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error checking contest participation:', error);
    return false;
  }
}

export async function getContestIdsForProblem(problemId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('contest_problems')
      .select('contest_id')
      .eq('problem_id', problemId);

    if (error) {
      console.error('Error getting contests for problem:', error);
      return [];
    }

    return (data || []).map((r: { contest_id: string }) => r.contest_id);
  } catch (error) {
    console.error('Error getting contests for problem:', error);
    return [];
  }
}
