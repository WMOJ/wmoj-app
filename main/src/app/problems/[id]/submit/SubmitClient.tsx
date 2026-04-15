'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { CodeEditorLoading } from '@/components/LoadingStates';
import { LoadingSpinner } from '@/components/AnimationWrapper';
import { Problem } from '@/types/problem';
import { useCountdown } from '@/contexts/CountdownContext';
import { Badge } from '@/components/ui/Badge';

const CodeEditor = dynamic(() => import('@/components/CodeEditor'), {
  ssr: false,
  loading: () => <CodeEditorLoading lines={20} />,
});

interface SubmitClientProps {
  problem: Problem;
  activeContestId: string | null;
  isVirtualContest?: boolean;
}

const languages = [
  { value: 'python', label: 'Python' },
  { value: 'cpp', label: 'C++' },
  { value: 'java', label: 'Java' },
];

export default function SubmitClient({ problem, activeContestId, isVirtualContest }: SubmitClientProps) {
  const router = useRouter();
  const { user, session } = useAuth();
  const { isActive, contestId } = useCountdown();

  const [selectedLanguage, setSelectedLanguage] = useState('python');
  const [codeText, setCodeText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [results, setResults] = useState<Array<{
    index: number; exitCode: number | null; timedOut: boolean;
    stdout: string; stderr: string; passed: boolean; expected: string; received: string;
  }> | null>(null);
  const [summary, setSummary] = useState<{ total: number; passed: number; failed: number } | null>(null);

  useEffect(() => {
    if (!activeContestId || isVirtualContest) return;
    const countdownResolved = isActive !== undefined && (contestId !== null || !isActive);
    if (!countdownResolved) return;
    if (!isActive || (contestId && contestId !== activeContestId)) router.replace('/contests');
  }, [isActive, contestId, activeContestId, router, isVirtualContest]);

  const handleSubmit = async () => {
    if (!problem || !user || !codeText.trim()) return;
    setSubmitting(true);
    setSubmitError('');
    setResults(null);
    setSummary(null);
    try {
      const resp = await fetch(`/api/problems/${problem.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ language: selectedLanguage, code: codeText }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'Submission failed');
      setResults(data.results || []);
      setSummary(data.summary || null);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-4">
      {/* Top bar */}
      <div className="flex items-center gap-3">
        <Link
          href={`/problems/${problem.id}`}
          className="text-sm text-text-muted hover:text-foreground inline-flex items-center gap-1.5 shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Link>
        <span className="text-text-muted">/</span>
        <span className="text-sm font-medium text-foreground truncate">{problem.name}</span>
      </div>

      {/* Editor + Action panel */}
      <div className="grid lg:grid-cols-[1fr_300px] gap-4 items-start">
        {/* Editor */}
        <div className="glass-panel overflow-hidden">
          <CodeEditor
            language={selectedLanguage}
            value={codeText}
            onChange={setCodeText}
            height="calc(100vh - 160px)"
          />
        </div>

        {/* Action panel */}
        <div className="glass-panel p-5 sticky top-20 space-y-4">
          {/* Language selector */}
          <div>
            <label className="text-xs font-medium text-text-muted uppercase tracking-wide block mb-2">Language</label>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="w-full h-9 px-3 bg-surface-2 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-brand-primary"
            >
              {languages.map((lang) => (
                <option key={lang.value} value={lang.value}>{lang.label}</option>
              ))}
            </select>
          </div>

          {/* Submit button */}
          {submitError && (
            <div className="bg-error/10 border border-error/20 text-error text-xs p-3 rounded-lg">{submitError}</div>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!codeText.trim() || submitting}
            className="w-full h-10 bg-brand-primary text-white text-sm font-medium rounded-lg hover:bg-brand-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
          >
            {submitting ? (
              <><LoadingSpinner size="sm" /><span>Submitting...</span></>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Submit Solution
              </>
            )}
          </button>

          {/* Results */}
          {(submitting || summary) && (
            <div className="space-y-3">
              <div className="h-px bg-border" />
              {submitting ? (
                <div className="flex items-center gap-2 py-2">
                  <LoadingSpinner size="sm" />
                  <span className="text-sm text-text-muted">Evaluating...</span>
                </div>
              ) : summary ? (
                <>
                  {/* Summary */}
                  <div className="p-3 rounded-lg bg-surface-2 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant={summary.failed === 0 ? 'success' : 'error'}>
                        {summary.failed === 0 ? 'Accepted' : 'Failed'}
                      </Badge>
                      <span className="text-sm font-mono font-semibold text-brand-primary">
                        {Math.round((summary.passed / summary.total) * 100)}%
                      </span>
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <div className="text-xs text-text-muted mb-0.5">Tests Passed</div>
                        <div className="text-lg font-semibold text-foreground font-mono">
                          {summary.passed}<span className="text-text-muted mx-0.5">/</span>{summary.total}
                        </div>
                      </div>
                    </div>
                    <div className="w-full bg-surface-1 rounded h-1 overflow-hidden">
                      <div
                        className={`h-full ${summary.failed === 0 ? 'bg-success' : 'bg-brand-primary'}`}
                        style={{ width: `${(summary.passed / summary.total) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Test case list */}
                  {results && results.length > 0 && (
                    <div className="space-y-1.5 max-h-[40vh] overflow-y-auto pr-1">
                      {results.map((r) => (
                        <div key={r.index} className="p-2.5 rounded-lg bg-surface-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${r.passed ? 'bg-success' : 'bg-error'}`} />
                              <span className="text-xs text-foreground font-mono">Test {r.index + 1}</span>
                            </div>
                            <span className="text-xs text-text-muted font-mono">
                              exit {r.exitCode}{r.timedOut ? ' · TLE' : ''}
                            </span>
                          </div>
                          {!r.passed && (
                            <div className="mt-2 space-y-1.5 text-xs font-mono">
                              <div>
                                <div className="text-text-muted mb-0.5">Expected</div>
                                <pre className="p-1.5 rounded bg-surface-1 text-text-muted overflow-x-auto border border-border text-xs">{r.expected}</pre>
                              </div>
                              <div>
                                <div className="text-text-muted mb-0.5">Received</div>
                                <pre className="p-1.5 rounded bg-surface-1 text-error overflow-x-auto border border-border text-xs">{r.received}</pre>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
