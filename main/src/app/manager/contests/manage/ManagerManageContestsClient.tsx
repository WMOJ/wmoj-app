"use client";

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { AuthGuard } from '@/components/AuthGuard';
import { ManagerGuard } from '@/components/ManagerGuard';
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

export default function ManagerManageContestsClient({ initialContests }: { initialContests: ContestRow[] }) {
  const { session } = useAuth();
  const [contests, setContests] = useState<ContestRow[]>(initialContests);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const token = session?.access_token;

  const pendingContests = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contests.filter(c => {
      if (c.is_active) return false;
      if (!q) return true;
      return c.name.toLowerCase().includes(q);
    });
  }, [contests, search]);

  const allContests = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contests.filter(c => {
      if (!q) return true;
      return c.name.toLowerCase().includes(q);
    });
  }, [contests, search]);

  const toggleActive = async (c: ContestRow) => {
    try {
      const res = await fetch(`/api/manager/contests/${c.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ is_active: !c.is_active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to toggle');
      setContests(prev => prev.map(row => row.id === c.id ? { ...row, is_active: !c.is_active } : row));
    } catch (e: unknown) { setActionMessage(e instanceof Error ? e.message : 'Failed to toggle'); }
  };

  const deleteContest = async (c: ContestRow) => {
    if (!confirm('Delete this contest? All problems in this contest will become standalone problems. This action cannot be undone.')) return;
    try {
      const res = await fetch(`/api/manager/contests/${c.id}`, { method: 'DELETE', headers: token ? { Authorization: `Bearer ${token}` } : undefined });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete');
      setContests(prev => prev.filter(row => row.id !== c.id));
    } catch (e: unknown) { setActionMessage(e instanceof Error ? e.message : 'Failed to delete'); }
  };

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
      key: 'actions', header: 'Actions', className: 'w-[34%]', render: (r) => (
        <div className="flex gap-1.5">
          <Link
            href={`/contests/${r.id}/view`}
            target="_blank"
            rel="noopener"
            className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-surface-2 text-foreground hover:bg-surface-3"
          >
            View Contest
          </Link>
          <Link href={`/manager/contests/${r.id}/edit`} className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20">Edit</Link>
          <button onClick={() => toggleActive(r)} className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-warning/10 text-warning hover:bg-warning/20">{r.is_active ? 'Deactivate' : 'Activate'}</button>
          <button onClick={() => deleteContest(r)} className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-error/10 text-error hover:bg-error/20">Delete</button>
        </div>
      )
    },
  ];

  return (
    <AuthGuard requireAuth allowAuthenticated>
      <ManagerGuard>
        <div className="w-full space-y-6">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Manage Contests</h1>
            <p className="text-sm text-text-muted mt-1">Review and approve contests created by admins.</p>
          </div>

          {actionMessage && (
            <div className="p-2.5 rounded-md bg-surface-2 border border-border text-sm flex justify-between items-center text-foreground">
              <span>{actionMessage}</span>
              <button onClick={() => setActionMessage(null)} className="text-text-muted hover:text-foreground text-lg leading-none">×</button>
            </div>
          )}

          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name..." className="w-full h-9 px-3 bg-surface-2 border border-border rounded-md text-sm text-foreground placeholder-text-muted/50 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20" />

          <div className="glass-panel overflow-hidden">
            <div className="bg-surface-2 px-4 py-3 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Pending Review</h2>
              <span className="text-xs text-text-muted font-mono">{pendingContests.length} item{pendingContests.length !== 1 ? 's' : ''}</span>
            </div>
            {pendingContests.length === 0 ? (
              <p className="text-sm text-text-muted px-4 py-4">No pending contests. All contests are active.</p>
            ) : (
              <DataTable<Row> columns={columns} rows={pendingContests} rowKey={(r) => r.id} pageSize={15} />
            )}
          </div>

          <div className="glass-panel overflow-hidden">
            <div className="bg-surface-2 px-4 py-3 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">All Contests</h2>
              <span className="text-xs text-text-muted font-mono">{allContests.length} total</span>
            </div>
            {allContests.length === 0 ? (
              <p className="text-sm text-text-muted px-4 py-4">No contests found.</p>
            ) : (
              <DataTable<Row> columns={columns} rows={allContests} rowKey={(r) => r.id} pageSize={20} />
            )}
          </div>

        </div>
      </ManagerGuard>
    </AuthGuard>
  );
}
