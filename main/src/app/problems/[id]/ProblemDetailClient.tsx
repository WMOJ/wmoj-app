'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { AuthPromptModal } from '@/components/AuthPromptModal';
import { Problem } from '@/types/problem';
import { useCountdown } from '@/contexts/CountdownContext';
import { Badge } from '@/components/ui/Badge';

interface ProblemDetailClientProps {
  problem: Problem;
  initialBestSummary: { total: number; passed: number; failed: number } | null;
  isVirtualContest?: boolean;
}

export default function ProblemDetailClient({ problem, initialBestSummary, isVirtualContest }: ProblemDetailClientProps) {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { isActive, contestId } = useCountdown();
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const bestSummary = initialBestSummary;

  useEffect(() => {
    if (!problem?.contest || isVirtualContest) return;
    const countdownResolved = isActive !== undefined && (contestId !== null || !isActive);
    if (!countdownResolved) return;
    if (!isActive || (contestId && contestId !== problem.contest)) router.replace('/contests');
  }, [isActive, contestId, problem?.contest, router, isVirtualContest]);

  const handleSubmitClick = () => {
    if (!user) { setShowAuthPrompt(true); return; }
    router.push(`/problems/${problem.id}/submit`);
  };

  return (
    <>
      {showAuthPrompt && <AuthPromptModal message="Log in or sign up to submit your solution and track your progress." onClose={() => setShowAuthPrompt(false)} />}
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Back */}
        <button
          type="button"
          onClick={() => router.push(problem?.contest && !isVirtualContest ? `/contests/${problem.contest}` : '/problems')}
          className="text-sm text-text-muted hover:text-foreground inline-flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" /></svg>
          Back to {problem?.contest && !isVirtualContest ? 'Contest' : 'Problems'}
        </button>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2">
            <div className="glass-panel p-6">
              {/* Header */}
              <div className="flex flex-wrap items-center gap-3 mb-5">
                <h1 className="text-lg font-semibold text-foreground">{problem.name}</h1>
                <Badge variant={problem.contest && !isVirtualContest ? 'info' : 'neutral'}>
                  {problem.contest && !isVirtualContest ? 'Contest' : 'Standalone'}
                </Badge>
              </div>

              {/* Description */}
              <div className="min-h-[400px] max-w-none">
                <MarkdownRenderer content={problem.content} />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="glass-panel p-5 sticky top-20">
              <h2 className="text-sm font-medium text-foreground mb-4">Problem Details</h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-text-muted">Test Cases</span>
                  <span className="text-foreground font-mono">{problem.input.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-muted">Points</span>
                  <span className="text-foreground font-mono">{problem.points} pts</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-muted">Time Limit</span>
                  <span className="text-foreground font-mono">{problem.time_limit || 5000}ms</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-muted">Memory</span>
                  <span className="text-foreground font-mono">{problem.memory_limit || 256}MB</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-muted">Added</span>
                  <span className="text-foreground font-mono">{new Date(problem.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              {user && bestSummary && (
                <div className="mt-5 pt-5 border-t border-border">
                  <h3 className="text-sm font-medium text-foreground mb-2">Best Submission</h3>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={bestSummary.failed === 0 ? 'success' : 'warning'}>
                        {bestSummary.passed}/{bestSummary.total}
                      </Badge>
                    </div>
                    <span className="text-sm text-brand-primary font-mono font-medium">
                      {Math.round((bestSummary.passed / bestSummary.total) * 100)}%
                    </span>
                  </div>
                </div>
              )}

              {/* Submit + view submissions */}
              <div className="mt-5 pt-5 border-t border-border space-y-2">
                <button
                  type="button"
                  onClick={handleSubmitClick}
                  className="w-full h-9 bg-brand-primary text-white text-sm font-medium rounded-lg hover:bg-brand-secondary transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Submit Solution
                </button>

                {user && (
                  <Link
                    href={`/submissions?user=${encodeURIComponent(profile?.username ?? '')}&problem=${encodeURIComponent(problem.name)}`}
                    className="w-full h-9 border border-border text-sm font-medium text-foreground rounded-lg hover:bg-surface-2 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    My Submissions
                  </Link>
                )}

                <Link
                  href={`/submissions?problem=${encodeURIComponent(problem.name)}`}
                  className="w-full h-9 border border-border text-sm font-medium text-foreground rounded-lg hover:bg-surface-2 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  All Submissions
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
