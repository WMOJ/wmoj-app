'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import DataTable, { type DataTableColumn } from '@/components/DataTable';
import Pagination from '@/components/Pagination';
import { Problem } from '@/types/problem';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/Badge';
import { HotProblem } from './page';

export default function ProblemsClient({
  initialProblems,
  hotProblems,
  totalPages,
  currentPage,
}: {
  initialProblems: Problem[],
  hotProblems: HotProblem[],
  totalPages: number,
  currentPage: number,
}) {
  const { user } = useAuth();
  const [search, setSearch] = useState('');

  const fetcher = async () => {
    if (!user?.id || initialProblems.length === 0) return {};
    const problemIds = initialProblems.map(p => p.id);
    const { data, error } = await supabase.from('submissions').select('problem_id, summary').eq('user_id', user.id).in('problem_id', problemIds);
    if (error) { console.error('Status load error:', error); return {}; }

    const map: Record<string, 'solved' | 'attempted' | 'not_attempted'> = {};
    for (const id of problemIds) map[id] = 'not_attempted';
    const perProblem: Record<string, { any: boolean; solved: boolean }> = {};
    for (const row of data || []) {
      const pid = row.problem_id as string;
      const s = (row.summary || {}) as { total?: number; passed?: number; failed?: number };
      const total = Number(s.total ?? 0); const passed = Number(s.passed ?? 0); const failed = Number(s.failed ?? 0);
      const solved = total > 0 && failed === 0 && passed === total;
      if (!perProblem[pid]) perProblem[pid] = { any: false, solved: false };
      perProblem[pid].any = true;
      perProblem[pid].solved = perProblem[pid].solved || solved;
    }
    for (const [pid, agg] of Object.entries(perProblem)) { map[pid] = agg.solved ? 'solved' : 'attempted'; }
    return map;
  };

  const { data: statusMap } = useSWR(
    user?.id && initialProblems.length > 0 ? `problems-status-${user.id}` : null,
    fetcher
  );

  const statusByProblem = statusMap || {};

  const filteredProblems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return initialProblems;
    return initialProblems.filter(p => p.name.toLowerCase().includes(q) || (p.content || '').toLowerCase().includes(q));
  }, [initialProblems, search]);

  const renderDifficulty = (difficultyStr: string | null | undefined) => {
    const diffStr = difficultyStr || 'Easy';
    const variant = diffStr.toLowerCase() === 'hard' ? 'error' :
      diffStr.toLowerCase() === 'medium' ? 'warning' : 'success';
    return <Badge variant={variant as any}>{diffStr}</Badge>;
  };

  const columns: Array<DataTableColumn<Problem>> = [
    { key: 'name', header: 'Problem', className: 'w-[50%]', sortable: true, sortAccessor: (r) => r.name.toLowerCase(), render: (r) => <span className="text-foreground font-medium text-sm">{r.name}</span> },
    {
      key: 'difficulty', header: 'Difficulty', className: 'w-[15%]', render: (r) => renderDifficulty(r.difficulty)
    },
    {
      key: 'status', header: 'Status', className: 'w-[15%]', render: (r) => {
        const st = statusByProblem[r.id] || 'not_attempted';
        if (st === 'solved') return <Badge variant="success">Solved</Badge>;
        if (st === 'attempted') return <Badge variant="warning">Attempted</Badge>;
        return <Badge variant="neutral">—</Badge>;
      }
    },
    {
      key: 'actions', header: '', className: 'w-[20%] text-right', render: (r) => (
        <Link href={`/problems/${r.id}`} className="text-sm text-brand-primary hover:text-brand-secondary font-medium">
          Solve →
        </Link>
      )
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground mb-1">Practice Problems</h1>
        <p className="text-sm text-text-muted">Solve standalone problems to sharpen your skills</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Column: Problem List */}
        <div className="flex-[3] min-w-0">
          <div className="glass-panel overflow-hidden">
            <div className="bg-surface-2 px-4 py-3 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Problems</h2>
            </div>
            {initialProblems.length === 0 ? (
              <div className="text-center py-12">
                <h3 className="text-base font-medium text-foreground mb-1">No Problems Available</h3>
                <p className="text-sm text-text-muted">Check back later for new problems.</p>
              </div>
            ) : (
              <>
                <div className="px-4 py-2 border-b border-border">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    buildHref={(p) => `?page=${p}`}
                  />
                </div>
                {filteredProblems.length === 0 ? (
                  <div className="text-center py-12 text-sm text-text-muted">
                    No problems match your search.
                  </div>
                ) : (
                  <DataTable<Problem> columns={columns} rows={filteredProblems} rowKey={(r) => r.id} headerVariant="gray" />
                )}
              </>
            )}
          </div>
        </div>

        {/* Right Column: Sidebar */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* Problem Search */}
          <div className="glass-panel overflow-hidden">
            <div className="bg-surface-2 px-4 py-3 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Problem search</h2>
            </div>
            <div className="p-4 bg-surface-1">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search problems..."
                className="w-full h-9 px-3 rounded-md bg-surface-2 border border-border text-sm text-foreground placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
              />
            </div>
          </div>

          {/* Hot Problems */}
          <div className="glass-panel overflow-hidden">
            <div className="bg-surface-2 px-4 py-3 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Hot problems</h2>
            </div>
            <div className="divide-y divide-border">
              {hotProblems.length === 0 ? (
                <div className="p-4 text-center text-text-muted text-xs">No hot problems yet.</div>
              ) : (
                hotProblems.map((problem, i) => (
                  <div key={problem.id} className="p-4 flex items-center justify-between gap-3 bg-surface-1 hover:bg-surface-2 transition-colors">
                    <Link href={`/problems/${problem.id}`} className="block text-sm font-semibold text-brand-primary hover:text-brand-secondary transition-colors truncate">
                      {i + 1}. {problem.name}
                    </Link>
                    <div className="shrink-0 flex items-center gap-2">
                      {renderDifficulty(problem.difficulty)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
