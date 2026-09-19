'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import DataTable, { type DataTableColumn } from '@/components/DataTable';
import { SubmissionDetailModal } from '@/components/SubmissionDetailModal';
import Pagination from '@/components/Pagination';
import { usePaginatedNavigation } from '@/hooks/usePaginatedNavigation';
import { useViewCode } from '@/hooks/useViewCode';
import { getSubmissionScoreCell } from '@/lib/submissionScoreCell';
import { displayLanguage } from '@/lib/languages';
import type { ProblemSubmissionRow } from './page';
import { formatSubmittedAt } from '@/utils/formatDate';

export default function ProblemSubmissionsClient({
  initialSubmissions,
  initialProblemName,
  currentPage,
  totalPages,
  totalCount,
}: {
  initialSubmissions: ProblemSubmissionRow[];
  initialProblemName: string;
  currentPage: number;
  totalPages: number;
  totalCount: number;
}) {
  const { session } = useAuth();
  const [selectedRow, setSelectedRow] = useState<ProblemSubmissionRow | null>(null);
  const problemName = initialProblemName;

  const currentParams: Record<string, string | undefined> = {};
  const { displayPage, isLoading, handlePageChange, buildHref } = usePaginatedNavigation({
    currentPage,
    totalPages,
    currentParams,
  });

  const { selected, loading: viewCodeLoading, open: openViewCode, close: closeViewCode } = useViewCode({
    buildUrl: (id) => `/api/admin/submissions/${id}`,
    getToken: () => session?.access_token,
  });

  const handleCloseViewCode = () => { closeViewCode(); setSelectedRow(null); };

  type Row = ProblemSubmissionRow;
  const columns: Array<DataTableColumn<Row>> = [
    {
      key: 'user',
      header: 'User',
      className: 'w-3/12',
      sortable: true,
      sortAccessor: (r) => (r.username || r.email).toLowerCase(),
      render: (r) => (
        <div className="flex flex-col">
          <span className="font-medium text-foreground">{r.username}</span>
          <span className="text-xs text-text-muted">{r.email}</span>
        </div>
      ),
    },
    {
      key: 'result',
      header: 'Result',
      className: 'w-20 text-center border-x border-border',
      compactPadding: true,
      cellClassName: (r) =>
        `${getSubmissionScoreCell({
          passed: r.summary?.passed,
          total: r.summary?.total,
          isCompileError: r.isCompileError,
        }).colorClass} font-mono font-semibold text-xs`,
      render: (r) =>
        getSubmissionScoreCell({
          passed: r.summary?.passed,
          total: r.summary?.total,
          isCompileError: r.isCompileError,
        }).text,
    },
    {
      key: 'language',
      header: 'Language',
      className: 'w-2/12',
      sortable: true,
      sortAccessor: (r) => r.language,
      render: (r) => (
        <span className="text-xs font-mono bg-surface-2 px-2 py-0.5 rounded">
          {displayLanguage(r.language)}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Date',
      className: 'w-2/12',
      sortable: true,
      sortAccessor: (r) => (r.created_at ? new Date(r.created_at).getTime() : 0),
      render: (r) => (
        <span className="text-text-muted text-sm font-mono">
          {formatSubmittedAt(r.created_at)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'w-3/12',
      render: (r) => (
        <button
          onClick={() => {
            setSelectedRow(r);
            openViewCode(r.id);
          }}
          className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20"
        >
          View Code
        </button>
      ),
    },
  ];

  return (
    <AuthGuard requireAuth allowAuthenticated>
      <div className="w-full space-y-6">
        <div>
          <Link href="/admin/problems/manage" className="text-sm text-text-muted hover:text-foreground">← Back to Problems</Link>
          <h1 className="text-xl font-semibold text-foreground mt-2">Submissions: {problemName}</h1>
          <p className="text-sm text-text-muted mt-1">View and manage user submissions for this problem.</p>
        </div>

        <div className="glass-panel overflow-hidden">
          <div className="bg-surface-2 px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">All Submissions</h2>
            <span className="text-xs text-text-muted font-mono">{totalCount} total</span>
          </div>
          <div className="px-4 py-2 border-b border-border flex items-center justify-between">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              buildHref={buildHref}
              displayPage={displayPage}
              loading={isLoading}
              onPageChange={handlePageChange}
            />
          </div>
          {initialSubmissions.length > 0 || isLoading ? (
            <DataTable<Row> columns={columns} rows={initialSubmissions} rowKey={(r) => r.id} loading={isLoading} skeletonRowCount={20} />
          ) : (
            <p className="text-sm text-text-muted text-center py-8">No submissions found for this problem.</p>
          )}
        </div>
      </div>

      <SubmissionDetailModal
        submission={selected}
        loading={viewCodeLoading}
        subtitle={selectedRow ? `by ${selectedRow.username} • ${formatSubmittedAt(selectedRow.created_at)}` : 'Loading…'}
        onClose={handleCloseViewCode}
      />
    </AuthGuard>
  );
}
