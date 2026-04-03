import { getServerSupabase } from '@/lib/supabaseServer';
import SubmissionsClient from './SubmissionsClient';

export interface SubmissionRow {
  id: string;
  username: string;
  problem_name: string;
  language: string;
  status: string;
  passed: number;
  total: number;
  created_at: string;
  classification: 'passed' | 'failed' | 'timeout' | 'compile_error' | 'error';
}

export interface SubmissionStats {
  passed: number;
  failed: number;
  timeout: number;
  compile_error: number;
  error: number;
  total: number;
}

type ResultItem = {
  timedOut?: boolean;
  exitCode?: number;
};

function classify(
  status: string,
  results: ResultItem[] | null,
  summaryTotal: number,
): SubmissionRow['classification'] {
  if (status === 'passed') return 'passed';
  const res = results || [];
  if (res.length === 0 && summaryTotal === 0) return 'compile_error';
  if (res.some((r) => r.timedOut)) return 'timeout';
  if (res.some((r) => (r.exitCode ?? 0) !== 0)) return 'error';
  return 'failed';
}

export default async function SubmissionsPage() {
  const supabase = await getServerSupabase();

  let submissions: SubmissionRow[] = [];
  let stats: SubmissionStats = { passed: 0, failed: 0, timeout: 0, compile_error: 0, error: 0, total: 0 };
  let fetchError: string | undefined;

  try {
    const [submissionsResult, usersResult, problemsResult] = await Promise.all([
      supabase
        .from('submissions')
        .select('id, user_id, problem_id, language, status, summary, results, created_at')
        .order('created_at', { ascending: false }),
      supabase.from('users').select('id, username'),
      supabase.from('problems').select('id, name'),
    ]);

    if (submissionsResult.error) {
      fetchError = 'Failed to fetch submissions';
    } else {
      const rawSubs = submissionsResult.data || [];
      const users = usersResult.data || [];
      const problems = problemsResult.data || [];

      const userMap = new Map(users.map((u) => [u.id, u.username]));
      const problemMap = new Map(problems.map((p) => [p.id, p.name]));

      submissions = rawSubs.map((s) => {
        const summary = s.summary as { passed?: number; total?: number } | null;
        const passed = summary?.passed ?? 0;
        const total = summary?.total ?? 0;
        const cls = classify(s.status ?? 'failed', s.results as ResultItem[] | null, total);

        stats[cls]++;
        stats.total++;

        return {
          id: s.id,
          username: userMap.get(s.user_id) ?? 'Unknown',
          problem_name: problemMap.get(s.problem_id) ?? 'Unknown Problem',
          language: s.language,
          status: s.status ?? 'failed',
          passed,
          total,
          created_at: s.created_at,
          classification: cls,
        };
      });
    }
  } catch (err) {
    console.error('[SubmissionsPage] Error:', err);
    fetchError = 'Failed to fetch submissions';
  }

  return (
    <SubmissionsClient
      initialSubmissions={submissions}
      stats={stats}
      fetchError={fetchError}
    />
  );
}
