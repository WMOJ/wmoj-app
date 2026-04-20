'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import { ManagerGuard } from '@/components/ManagerGuard';
import DataTable, { type DataTableColumn } from '@/components/DataTable';
import dynamic from 'next/dynamic';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { toast } from '@/components/ui/Toast';

const SyntaxHighlighter = dynamic(
  () => import('react-syntax-highlighter').then((mod) => mod.Prism),
  { ssr: false, loading: () => <div className="bg-surface-2 animate-pulse h-32 rounded-lg my-3" /> }
);

type Verdict = 'AC' | 'WA' | 'TLE' | 'MLE' | 'RE' | 'CE' | 'IE';

interface TestResult {
    index: number;
    passed: boolean;
    stdout: string;
    stderr: string;
    exitCode: number;
    timedOut: boolean;
    expected: string;
    received: string;
    verdict?: Verdict;
    timeMs?: number;
    cpuMs?: number;
    memKb?: number;
}

interface Submission {
    id: string; user_id: string; username: string; email: string; language: string; code: string;
    results: TestResult[];
    summary: { total: number; passed: number; failed: number; };
    compileError?: string | null;
    created_at: string;
}

const LANGUAGE_DISPLAY: Record<string, string> = {
    python: 'Python',
    python3: 'Python 3',
    pypy3: 'PyPy 3',
    cpp: 'C++',
    cpp14: 'C++ 14',
    cpp17: 'C++ 17',
    java: 'Java 17',
};
function displayLanguage(code: string): string {
    return LANGUAGE_DISPLAY[code] || code.toUpperCase();
}

function syntaxLanguage(code: string): string {
    if (code === 'pypy3' || code === 'python3') return 'python';
    if (code === 'cpp14' || code === 'cpp17') return 'cpp';
    return code;
}

function aggregateVerdict(sub: Submission): Verdict {
    if (sub.compileError) return 'CE';
    const results = sub.results || [];
    if (results.length === 0) {
        const total = sub.summary?.total ?? 0;
        if (total === 0) return 'CE';
        return 'IE';
    }
    const rank: Verdict[] = ['TLE', 'MLE', 'RE', 'WA'];
    for (const v of rank) {
        if (results.some((r) => r.verdict === v)) return v;
    }
    for (const r of results) {
        if (!r.passed) {
            if (r.timedOut) return 'TLE';
            return 'WA';
        }
    }
    return 'AC';
}

const VERDICT_STYLES: Record<Verdict, string> = {
    AC: 'bg-success/10 text-success border border-success/20',
    WA: 'bg-error/10 text-error border border-error/20',
    TLE: 'bg-warning/10 text-warning border border-warning/20',
    MLE: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
    RE: 'bg-red-900/20 text-red-400 border border-red-900/30',
    CE: 'bg-surface-2 text-text-muted border border-border',
    IE: 'bg-black/30 text-foreground border border-border',
};

function VerdictBadge({ verdict }: { verdict: Verdict }) {
    return (
        <span
            className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-semibold ${VERDICT_STYLES[verdict]}`}
            title={verdict}
        >
            {verdict}
        </span>
    );
}

export default function ManagerProblemSubmissionsClient({
    initialSubmissions,
    initialProblemName
}: {
    initialSubmissions: Submission[];
    initialProblemName: string;
}) {
    const { session } = useAuth();
    const [submissions, setSubmissions] = useState<Submission[]>(initialSubmissions);
    const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
    const problemName = initialProblemName;
    const token = session?.access_token;

    const deleteSubmission = async (submissionId: string) => {
        if (!confirm('Delete this submission?')) return;
        try {
            const res = await fetch(`/api/manager/submissions/${submissionId}`, { method: 'DELETE', headers: token ? { Authorization: `Bearer ${token}` } : undefined });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to delete');
            setSubmissions(prev => prev.filter(s => s.id !== submissionId));
            if (selectedSubmission?.id === submissionId) setSelectedSubmission(null);
            toast.success('Submission deleted successfully');
        } catch (e: unknown) { toast.error('Error', e instanceof Error ? e.message : 'Failed to delete'); }
    };

    type Row = Submission;
    const columns: Array<DataTableColumn<Row>> = [
        {
            key: 'user', header: 'User', className: 'w-2/12', sortable: true, sortAccessor: (r) => (r.username || r.email).toLowerCase(), render: (r) => (
                <div className="flex flex-col">
                    <span className="font-medium text-foreground">{r.username}</span>
                    <span className="text-xs text-text-muted">{r.email}</span>
                </div>
            )
        },
        {
            key: 'status', header: 'Status', className: 'w-2/12', render: (r) => {
                const v = aggregateVerdict(r);
                return <VerdictBadge verdict={v} />;
            }
        },
        { key: 'score', header: 'Score', className: 'w-2/12', render: (r) => <span className="text-text-muted font-mono">{r.summary?.passed ?? 0}/{r.summary?.total ?? 0}</span> },
        { key: 'language', header: 'Language', className: 'w-1/12', sortable: true, sortAccessor: (r) => r.language, render: (r) => <span className="text-xs font-mono bg-surface-2 px-2 py-0.5 rounded">{displayLanguage(r.language)}</span> },
        { key: 'created_at', header: 'Date', className: 'w-2/12', sortable: true, sortAccessor: (r) => new Date(r.created_at).getTime(), render: (r) => <span className="text-text-muted text-sm font-mono">{new Date(r.created_at).toLocaleString()}</span> },
        {
            key: 'actions', header: 'Actions', className: 'w-3/12', render: (r) => (
                <div className="flex gap-1.5">
                    <button onClick={() => setSelectedSubmission(r)} className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20">View Code</button>
                    <button onClick={() => deleteSubmission(r.id)} className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-error/10 text-error hover:bg-error/20">Delete</button>
                </div>
            )
        },
    ];

    return (
        <AuthGuard requireAuth allowAuthenticated>
            <ManagerGuard>
                <div className="w-full space-y-6">
                    <div>
                        <Link href="/manager/problems/manage" className="text-sm text-text-muted hover:text-foreground">← Back to Problems</Link>
                        <h1 className="text-xl font-semibold text-foreground mt-2">Submissions: {problemName}</h1>
                        <p className="text-sm text-text-muted mt-1">View and manage user submissions for this problem.</p>
                    </div>

                    <div className="glass-panel overflow-hidden">
                        <div className="bg-surface-2 px-4 py-3 border-b border-border">
                            <h2 className="text-sm font-semibold text-foreground">All Submissions</h2>
                        </div>
                        {submissions.length === 0 ? (
                            <p className="text-sm text-text-muted text-center py-8">No submissions found for this problem.</p>
                        ) : (
                            <DataTable<Row> columns={columns} rows={submissions} rowKey={(r) => r.id} pageSize={20} />
                        )}
                    </div>
                </div>

                {selectedSubmission && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setSelectedSubmission(null)}>
                        <div className="w-full max-w-4xl bg-surface-1 border border-border rounded-lg flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                                <div>
                                    <h2 className="text-base font-semibold text-foreground">Submission Details</h2>
                                    <p className="text-xs text-text-muted">by {selectedSubmission.username} • {new Date(selectedSubmission.created_at).toLocaleString()}</p>
                                </div>
                                <button onClick={() => setSelectedSubmission(null)} className="text-text-muted hover:text-foreground text-lg">×</button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-5 space-y-4">
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-surface-2 p-3 rounded-md border border-border">
                                        <div className="text-text-muted text-xs uppercase tracking-wider">Verdict</div>
                                        <div className="mt-1">
                                            <VerdictBadge verdict={aggregateVerdict(selectedSubmission)} />
                                        </div>
                                    </div>
                                    <div className="bg-surface-2 p-3 rounded-md border border-border">
                                        <div className="text-text-muted text-xs uppercase tracking-wider">Score</div>
                                        <div className="text-sm font-semibold text-foreground mt-1 font-mono">{selectedSubmission.summary.passed}/{selectedSubmission.summary.total}</div>
                                    </div>
                                    <div className="bg-surface-2 p-3 rounded-md border border-border">
                                        <div className="text-text-muted text-xs uppercase tracking-wider">Language</div>
                                        <div className="text-sm font-semibold text-foreground mt-1">{displayLanguage(selectedSubmission.language)}</div>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-sm font-medium text-foreground mb-1.5">Source Code</h3>
                                    <div className="rounded-md overflow-hidden border border-border text-sm">
                                        <SyntaxHighlighter
                                            language={syntaxLanguage(selectedSubmission.language)}
                                            // @ts-ignore
                                            style={vscDarkPlus}
                                            customStyle={{ margin: 0, borderRadius: 0, maxHeight: '400px' }}
                                            showLineNumbers
                                        >
                                            {selectedSubmission.code}
                                        </SyntaxHighlighter>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-sm font-medium text-foreground mb-1.5">Test Case Results</h3>
                                    <div className="space-y-1.5">
                                        {selectedSubmission.results?.map((r, i) => {
                                            const v: Verdict = r.verdict
                                                ? r.verdict
                                                : r.passed
                                                ? 'AC'
                                                : r.timedOut
                                                ? 'TLE'
                                                : 'WA';
                                            return (
                                            <div key={i} className={`p-2.5 rounded-md border ${r.passed ? 'bg-success/5 border-success/20' : 'bg-error/5 border-error/20'}`}>
                                                <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
                                                    <div className="flex items-center gap-2">
                                                        <VerdictBadge verdict={v} />
                                                        <span className="text-sm font-medium text-foreground">Case #{i + 1}</span>
                                                    </div>
                                                    <span className="text-xs text-text-muted font-mono flex items-center gap-2">
                                                        {typeof r.timeMs === 'number' && <span>{r.timeMs}ms</span>}
                                                        {typeof r.memKb === 'number' && <span>{Math.round(r.memKb / 1024)}MB</span>}
                                                        <span>Exit: {r.exitCode ?? 'N/A'}</span>
                                                    </span>
                                                </div>
                                                {!r.passed && (r.expected || r.received) && (
                                                    <div className="grid grid-cols-2 gap-2 mt-1 text-xs font-mono">
                                                        <div>
                                                            <div className="text-text-muted mb-0.5">Expected:</div>
                                                            <pre className="bg-surface-1 p-1.5 rounded overflow-x-auto text-text-muted border border-border">{r.expected}</pre>
                                                        </div>
                                                        <div>
                                                            <div className="text-text-muted mb-0.5">Received:</div>
                                                            <pre className="bg-surface-1 p-1.5 rounded overflow-x-auto text-error border border-border">{r.received}</pre>
                                                        </div>
                                                        {r.stderr && (
                                                            <div className="col-span-2">
                                                                <div className="text-text-muted mb-0.5">Stderr:</div>
                                                                <pre className="bg-surface-1 p-1.5 rounded overflow-x-auto text-warning border border-border">{r.stderr}</pre>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            <div className="px-5 py-3 border-t border-border flex justify-end">
                                <button onClick={() => setSelectedSubmission(null)} className="px-4 py-1.5 rounded-md bg-surface-2 hover:bg-surface-3 text-sm font-medium text-foreground">Close</button>
                            </div>
                        </div>
                    </div>
                )}
            </ManagerGuard>
        </AuthGuard>
    );
}
