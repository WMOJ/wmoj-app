import { ALLOWED_LANGUAGES } from '@/lib/languages';
import type { AppSupabaseClient } from '@/types/supabase';

export interface PlatformStats {
  developersCount: number;
  problemsCount: number;
  submissionsCount: number;
  languagesCount: number;
}

/**
 * Formats a numeric count using standard US locale formatting (e.g. 7,921,700).
 * Falls back to '0' for non-finite or negative numbers.
 */
export function formatStatCount(count: number): string {
  if (!Number.isFinite(count) || count < 0) {
    return '0';
  }
  return Math.floor(count).toLocaleString('en-US');
}

/**
 * Counts how many distinct languages have at least one submission.
 * Falls back to `fallback` if no languages have any submissions.
 */
export function countActiveLanguages(
  counts: (number | null | undefined)[],
  fallback: number = ALLOWED_LANGUAGES.length
): number {
  const active = counts.filter((c) => (c ?? 0) > 0).length;
  return active > 0 ? active : fallback;
}

/**
 * Fetches platform aggregate statistics concurrently from Supabase using PostgREST HEAD queries.
 *
 * Uses `{ count: 'exact', head: true }` so no row data is transferred across the network.
 * If any query fails, the function logs the error and gracefully falls back to zero / default
 * counts so that a database anomaly or cold start never breaks the landing page.
 */
export async function fetchPlatformStats(supabase: AppSupabaseClient): Promise<PlatformStats> {
  try {
    const [usersResult, problemsResult, submissionsResult, ...langResults] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('problems').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('submissions').select('id', { count: 'exact', head: true }),
      ...ALLOWED_LANGUAGES.map((lang) =>
        supabase
          .from('submissions')
          .select('id', { count: 'exact', head: true })
          .eq('language', lang)
          .limit(1)
      ),
    ]);

    if (usersResult.error) {
      console.error('[fetchPlatformStats] Error counting users:', usersResult.error);
    }
    if (problemsResult.error) {
      console.error('[fetchPlatformStats] Error counting problems:', problemsResult.error);
    }
    if (submissionsResult.error) {
      console.error('[fetchPlatformStats] Error counting submissions:', submissionsResult.error);
    }

    const developersCount = usersResult.count ?? 0;
    const problemsCount = problemsResult.count ?? 0;
    const submissionsCount = submissionsResult.count ?? 0;
    const languagesCount = countActiveLanguages(
      langResults.map((r) => r.count),
      ALLOWED_LANGUAGES.length
    );

    return {
      developersCount,
      problemsCount,
      submissionsCount,
      languagesCount,
    };
  } catch (err) {
    console.error('[fetchPlatformStats] Failed to fetch platform stats:', err);
    return {
      developersCount: 0,
      problemsCount: 0,
      submissionsCount: 0,
      languagesCount: ALLOWED_LANGUAGES.length,
    };
  }
}
