import { getServerSupabase } from '@/lib/supabaseServer';
import { notFound } from 'next/navigation';
import ContestLeaderboardClient from './LeaderboardClient';
import { canUserAccessContest } from '@/lib/contestAccess';

export default async function ContestLeaderboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getServerSupabase();

  const [contestResult, cpResult, authResult] = await Promise.all([
    supabase
      .from('contests')
      .select('id, name, is_active, created_by')
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('contest_problems')
      .select('problem_id')
      .eq('contest_id', id),
    supabase.auth.getUser(),
  ]);

  const { data: contestData, error: contestError } = contestResult;
  if (contestError || !contestData) {
    notFound();
  }

  const { data: authUser } = authResult;
  const hasAccess = await canUserAccessContest(supabase, contestData, authUser?.user?.id ?? null);
  if (!hasAccess) {
    notFound();
  }

  const contestName = contestData.name || 'Contest';

  // Load leaderboard
  const problemIds = (cpResult.data || []).map((r: { problem_id: string }) => r.problem_id);

  let leaderboard: any[] = [];
  if (problemIds.length > 0) {
    const [submissionsResult, regularParticipantsResult] = await Promise.all([
      supabase
        .from('submissions')
        .select('user_id, problem_id, results, summary, created_at')
        .in('problem_id', problemIds),
      supabase
        .from('join_history')
        .select('user_id')
        .eq('contest_id', id)
        .eq('is_virtual', false)
    ]);

    const { data: submissions } = submissionsResult;
    const regularUserIds = new Set((regularParticipantsResult.data || []).map((r: { user_id: string }) => r.user_id));

    if (submissions) {
      const problemIdSet = new Set(problemIds);
      const userScores = new Map<string, { totalScore: number; problemScores: Map<string, number>; userId: string }>();

      submissions.forEach(submission => {
        if (!problemIdSet.has(submission.problem_id)) return;
        if (regularUserIds.size > 0 && !regularUserIds.has(submission.user_id)) return;
        const subUserId = submission.user_id;
        if (!userScores.has(subUserId)) {
          userScores.set(subUserId, { totalScore: 0, problemScores: new Map(), userId: subUserId });
        }
        const userData = userScores.get(subUserId)!;

        let score = 0;
        if (submission.summary && submission.summary.total > 0) {
          score = submission.summary.passed / submission.summary.total;
        } else if (submission.results && Array.isArray(submission.results) && submission.results.length > 0) {
          const passedCount = submission.results.filter((r: { passed: boolean }) => r.passed).length;
          score = passedCount / submission.results.length;
        }

        const currentProblemScore = userData.problemScores.get(submission.problem_id) || 0;
        if (score > currentProblemScore) {
          const scoreDiff = score - currentProblemScore;
          userData.problemScores.set(submission.problem_id, score);
          userData.totalScore += scoreDiff;
        }
      });

      const userIds = Array.from(userScores.keys());
      const { data: users } = await supabase
        .from('users')
        .select('id, username, email')
        .in('id', userIds);

      const userById = new Map(users?.map(u => [u.id, u]) || []);
      const totalProblems = problemIds.length;

      leaderboard = Array.from(userScores.values())
        .map(userData => {
          const user = userById.get(userData.userId);
          let solvedCount = 0;
          userData.problemScores.forEach(score => { if (score >= 0.999) solvedCount++; });
          return {
            user_id: userData.userId,
            username: user?.username || user?.email?.split('@')[0] || 'Unknown',
            total_score: userData.totalScore,
            solved_problems: solvedCount,
            total_problems: totalProblems,
            rank: 0
          };
        })
        .sort((a, b) => {
          if (Math.abs(b.total_score - a.total_score) > 0.001) return b.total_score - a.total_score;
          return b.solved_problems - a.solved_problems;
        })
        .map((entry, index) => ({ ...entry, rank: index + 1 }));
    }
  }

  return (
    <ContestLeaderboardClient
      contestName={contestName}
      initialLeaderboard={leaderboard}
    />
  );
}
