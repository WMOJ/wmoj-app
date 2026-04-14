"use client";

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { AuthGuard } from '@/components/AuthGuard';
import { AdminGuard } from '@/components/AdminGuard';
import { useAuth } from '@/contexts/AuthContext';
import DataTable, { type DataTableColumn } from '@/components/DataTable';
import { Badge } from '@/components/ui/Badge';
import { getContestStatus } from '@/utils/contestStatus';
import type { ContestStatus } from '@/types/contest';

interface ContestRow {
  id: string; name: string; length: number | null;
  is_active: boolean | null; created_at: string; updated_at: string;
  starts_at: string | null; ends_at: string | null; is_rated: boolean;
}

const STATUS_VARIANT: Record<ContestStatus, 'success' | 'info' | 'warning' | 'neutral'> = {
  ongoing: 'success', upcoming: 'info', virtual: 'warning', inactive: 'neutral',
};
const STATUS_LABEL: Record<ContestStatus, string> = {
  ongoing: 'Ongoing', upcoming: 'Upcoming', virtual: 'Virtual', inactive: 'Inactive',
};
const STATUS_SORT_ORDER: Record<ContestStatus, number> = {
  ongoing: 3, upcoming: 2, virtual: 1, inactive: 0,
};

export default function ManageContestsClient({ initialContests }: { initialContests: ContestRow[] }) {
  const { session } = useAuth();
  const [contests, setContests] = useState<ContestRow[]>(initialContests);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const token = session?.access_token;

  const filteredContests = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contests.filter(c => {
      if (filter === 'active' && !c.is_active) return false;
      if (filter === 'inactive' && c.is_active) return false;
      if (!q) return true;
      return c.name.toLowerCase().includes(q);
    });
  }, [contests, filter, search]);

  const deleteContest = async (c: ContestRow) => {
    if (!confirm('Delete this contest? All problems in this contest will become standalone problems. This action cannot be undone.')) return;
    try {
      const res = await fetch(`/api/admin/contests/${c.id}`, { method: 'DELETE', headers: token ? { Authorization: `Bearer ${token}` } : undefined });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete');
      setContests(prev => prev.filter(row => row.id !== c.id));
    } catch (e: unknown) { setActionMessage(e instanceof Error ? e.message : 'Failed to delete'); }
  };

  const filterOptions = ['all', 'active', 'inactive'] as const;

  type Row = ContestRow;
  const columns: Array<DataTableColumn<Row>> = [
    { key: 'name', header: 'Name', className: 'w-[25%]', sortable: true, sortAccessor: (r) => r.name.toLowerCase(), render: (r) => <span className="text-foreground font-medium">{r.name}</span> },
    { key: 'length', header: 'Length', className: 'w-[12%]', sortable: true, sortAccessor: (r) => r.length ?? 0, render: (r) => <span className="text-text-muted font-mono">{r.length ? `${r.length} min` : '-'}</span> },
    {
      key: 'status', header: 'Status', className: 'w-[14%]', sortable: true,
      sortAccessor: (r) => STATUS_SORT_ORDER[getContestStatus({ is_active: !!r.is_active, starts_at: r.starts_at, ends_at: r.ends_at })],
      render: (r) => {
        const s = getContestStatus({ is_active: !!r.is_active, starts_at: r.starts_at, ends_at: r.ends_at });
        return <Badge variant={STATUS_VARIANT[s]}>{STATUS_LABEL[s]}</Badge>;
      }
    },
    { key: 'updated', header: 'Updated', className: 'w-[15%]', sortable: true, sortAccessor: (r) => new Date(r.updated_at).getTime(), render: (r) => <span className="text-text-muted text-sm font-mono">{new Date(r.updated_at).toLocaleDateString()}</span> },
    {
      key: 'actions', header: 'Actions', className: 'w-[34%]', render: (r) => {
        const isActive = !!r.is_active;
        return (
          <div className="flex gap-1.5">
            {isActive ? (
              <span
                title="Cannot edit an activated contest"
                className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-brand-primary/10 text-brand-primary opacity-40 cursor-not-allowed"
              >
                Edit
              </span>
            ) : (
              <Link
                href={`/admin/contests/${r.id}/edit`}
                className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20"
              >
                Edit
              </Link>
            )}
            <button
              onClick={() => deleteContest(r)}
              disabled={isActive}
              title={isActive ? 'Cannot delete an activated contest' : undefined}
              className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-error/10 text-error hover:bg-error/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-error/10"
            >
              Delete
            </button>
          </div>
        );
      }
    },
  ];

  return (
    <AuthGuard requireAuth allowAuthenticated>
      <AdminGuard>
        <div className="w-full space-y-6">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Manage Contests</h1>
            <p className="text-sm text-text-muted mt-1">Edit or delete contests. Activation is managed by Managers.</p>
          </div>

          {actionMessage && (
            <div className="p-2.5 rounded-md bg-surface-2 border border-border text-sm flex justify-between items-center text-foreground">
              <span>{actionMessage}</span>
              <button onClick={() => setActionMessage(null)} className="text-text-muted hover:text-foreground text-lg leading-none">×</button>
            </div>
          )}

          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name..." className="flex-1 h-9 px-3 bg-surface-2 border border-border rounded-md text-sm text-foreground placeholder-text-muted/50 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20" />
            <div className="flex items-center gap-1.5">
              {filterOptions.map(f => (
                <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-md text-sm border capitalize ${filter === f ? 'text-brand-primary border-brand-primary/30 bg-brand-primary/10' : 'text-text-muted border-border hover:bg-surface-2'}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="glass-panel overflow-hidden">
            <div className="bg-surface-2 px-4 py-3 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">All Contests</h2>
            </div>
            {filteredContests.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-8">No contests match your filters.</p>
            ) : (
              <DataTable<Row> columns={columns} rows={filteredContests} rowKey={(r) => r.id} pageSize={20} />
            )}
          </div>

        </div>
      </AdminGuard>
    </AuthGuard>
  );
}
