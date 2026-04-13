"use client";

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { AuthGuard } from '@/components/AuthGuard';
import { ManagerGuard } from '@/components/ManagerGuard';
import { useAuth } from '@/contexts/AuthContext';
import DataTable, { type DataTableColumn } from '@/components/DataTable';
import { Badge } from '@/components/ui/Badge';
import { SkeletonText } from '@/components/LoadingStates';
import { getContestStatus, toLocalDatetimeInput, fromLocalDatetimeInput } from '@/utils/contestStatus';
import type { ContestStatus } from '@/types/contest';

interface ContestRow {
  id: string; name: string; length: number | null;
  is_active: boolean | null; created_at: string; updated_at: string;
  starts_at: string | null; ends_at: string | null; is_rated: boolean;
}

interface EditState {
  id: string; name: string; description: string; length: number | null;
  is_active: boolean; starts_at: string; ends_at: string; is_rated: boolean;
}

const MarkdownEditor = dynamic(() => import('@/components/MarkdownEditor').then(m => m.MarkdownEditor), { ssr: false });

const inputClass = "w-full h-9 px-3 bg-surface-2 border border-border rounded-md text-sm text-foreground focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20";

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
  const [editing, setEditing] = useState<EditState | null>(null);
  const [fetchingEditContent, setFetchingEditContent] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sidebarSearch, setSidebarSearch] = useState('');
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
    const q = sidebarSearch.trim().toLowerCase();
    return contests.filter(c => {
      if (!q) return true;
      return c.name.toLowerCase().includes(q);
    });
  }, [contests, sidebarSearch]);

  const openEdit = async (c: ContestRow) => {
    setFetchingEditContent(true);
    try {
      const res = await fetch(`/api/manager/contests/${c.id}`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load contest');
      setEditing({
        id: c.id,
        name: data.contest.name,
        description: data.contest.description || '',
        length: data.contest.length || null,
        is_active: !!c.is_active,
        starts_at: data.contest.starts_at ? toLocalDatetimeInput(data.contest.starts_at) : '',
        ends_at: data.contest.ends_at ? toLocalDatetimeInput(data.contest.ends_at) : '',
        is_rated: !!data.contest.is_rated,
      });
    } catch (e: unknown) { setActionMessage(e instanceof Error ? e.message : 'Failed to open editor'); }
    finally { setFetchingEditContent(false); }
  };

  const closeEdit = () => setEditing(null);

  const saveEdit = async () => {
    if (!editing) return;
    if (editing.starts_at && editing.ends_at && new Date(editing.starts_at) >= new Date(editing.ends_at)) {
      setActionMessage('Start date/time must be before end date/time');
      return;
    }
    try {
      const res = await fetch(`/api/manager/contests/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          name: editing.name,
          description: editing.description,
          length: editing.length,
          is_active: editing.is_active,
          starts_at: editing.starts_at ? fromLocalDatetimeInput(editing.starts_at) : null,
          ends_at: editing.ends_at ? fromLocalDatetimeInput(editing.ends_at) : null,
          is_rated: editing.is_rated,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      setActionMessage('Contest updated');
      setContests(prev => prev.map(c => c.id === editing.id ? {
        ...c,
        name: editing.name,
        is_active: editing.is_active,
        length: editing.length ?? c.length,
        starts_at: editing.starts_at ? fromLocalDatetimeInput(editing.starts_at) : null,
        ends_at: editing.ends_at ? fromLocalDatetimeInput(editing.ends_at) : null,
        is_rated: editing.is_rated,
        updated_at: new Date().toISOString(),
      } : c));
      closeEdit();
    } catch (e: unknown) { setActionMessage(e instanceof Error ? e.message : 'Failed to save'); }
  };

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
          <button onClick={() => openEdit(r)} className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20">Edit</button>
          <button onClick={() => toggleActive(r)} className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-warning/10 text-warning hover:bg-warning/20">{r.is_active ? 'Deactivate' : 'Activate'}</button>
          <button onClick={() => deleteContest(r)} className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-error/10 text-error hover:bg-error/20">Delete</button>
        </div>
      )
    },
  ];

  const sidebarColumns: Array<DataTableColumn<Row>> = [
    {
      key: 'name', header: 'Name', className: 'w-3/4', sortable: true,
      sortAccessor: (r) => r.name.toLowerCase(),
      render: (r) => <span className="text-foreground text-xs font-medium truncate block max-w-[160px]">{r.name}</span>,
    },
    {
      key: 'status', header: 'Status', className: 'w-1/4',
      render: (r) => {
        const s = getContestStatus({ is_active: !!r.is_active, starts_at: r.starts_at, ends_at: r.ends_at });
        return <Badge variant={STATUS_VARIANT[s]}>{STATUS_LABEL[s]}</Badge>;
      },
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

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
            {/* Primary: Pending Review */}
            <div className="lg:col-span-3 space-y-4">
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search pending contests..." className="w-full h-9 px-3 bg-surface-2 border border-border rounded-md text-sm text-foreground placeholder-text-muted/50 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20" />
              <div className="glass-panel overflow-hidden">
                <div className="bg-surface-2 px-4 py-3 border-b border-border flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-foreground">Pending Review</h2>
                  <span className="text-xs text-text-muted font-mono">{pendingContests.length} item{pendingContests.length !== 1 ? 's' : ''}</span>
                </div>
                {pendingContests.length === 0 ? (
                  <p className="text-sm text-text-muted text-center py-8">No pending contests. All contests are active.</p>
                ) : (
                  <DataTable<Row> columns={columns} rows={pendingContests} rowKey={(r) => r.id} pageSize={15} />
                )}
              </div>
            </div>

            {/* Sidebar: All Contests */}
            <div className="lg:col-span-1">
              <div className="glass-panel overflow-hidden sticky top-20">
                <div className="bg-surface-2 px-4 py-3 border-b border-border">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-foreground">All Contests</h2>
                    <span className="text-xs text-text-muted font-mono">{allContests.length}</span>
                  </div>
                </div>
                <div className="px-3 pt-3">
                  <input value={sidebarSearch} onChange={e => setSidebarSearch(e.target.value)} placeholder="Search..." className="w-full h-8 px-2.5 bg-surface-2 border border-border rounded-md text-xs text-foreground placeholder-text-muted/50 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20" />
                </div>
                {allContests.length === 0 ? (
                  <p className="text-xs text-text-muted text-center py-6">No contests found.</p>
                ) : (
                  <DataTable<Row> columns={sidebarColumns} rows={allContests} rowKey={(r) => r.id} pageSize={10} />
                )}
              </div>
            </div>
          </div>

          {editing && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
              <div className="w-full max-w-4xl bg-surface-1 border border-border rounded-lg flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                  <div>
                    <h2 className="text-base font-semibold text-foreground">Edit Contest</h2>
                    <p className="text-xs text-text-muted">Modify contest settings & description</p>
                  </div>
                  <button onClick={closeEdit} className="text-text-muted hover:text-foreground text-lg">✕</button>
                </div>
                <div className="overflow-y-auto px-5 py-4 space-y-4">
                  {fetchingEditContent ? (
                    <SkeletonText lines={3} />
                  ) : (
                    <>
                      <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-foreground">Contest ID</label>
                        <input className={`${inputClass} opacity-60 cursor-not-allowed`} value={editing.id} readOnly disabled />
                        <p className="text-xs text-text-muted">The contest ID cannot be changed after creation.</p>
                      </div>
                      <div className="grid md:grid-cols-3 gap-4 items-start">
                        <div className="md:col-span-2 space-y-1.5">
                          <label className="block text-sm font-medium text-foreground">Name</label>
                          <input className={inputClass} value={editing.name} placeholder="Contest title" onChange={e => setEditing(s => s ? { ...s, name: e.target.value } : s)} />
                        </div>
                        <div className="space-y-2 pt-5 md:pt-0">
                          <label className="inline-flex items-center gap-2 text-sm text-foreground">
                            <input type="checkbox" className="h-4 w-4 rounded border-border bg-surface-2" checked={editing.is_active} onChange={e => setEditing(s => s ? { ...s, is_active: e.target.checked } : s)} />
                            Active
                          </label>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-foreground">Length (minutes)</label>
                        <input type="number" className={`${inputClass} max-w-xs`} value={editing.length ?? ''} onChange={e => setEditing(s => s ? { ...s, length: e.target.value ? Number(e.target.value) : null } : s)} />
                        <p className="text-xs text-text-muted">Leave blank for unspecified length.</p>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="block text-sm font-medium text-foreground">
                            Start Date/Time <span className="text-text-muted font-normal text-xs">(optional)</span>
                          </label>
                          <input
                            type="datetime-local"
                            className={inputClass}
                            value={editing.starts_at}
                            onChange={e => setEditing(s => s ? { ...s, starts_at: e.target.value } : s)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-sm font-medium text-foreground">
                            End Date/Time <span className="text-text-muted font-normal text-xs">(optional)</span>
                          </label>
                          <input
                            type="datetime-local"
                            className={inputClass}
                            value={editing.ends_at}
                            onChange={e => setEditing(s => s ? { ...s, ends_at: e.target.value } : s)}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="inline-flex items-center gap-2 text-sm text-foreground cursor-pointer">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-border bg-surface-2"
                            checked={editing.is_rated}
                            onChange={e => setEditing(s => s ? { ...s, is_rated: e.target.checked } : s)}
                          />
                          Rated Contest
                        </label>
                        <p className="text-xs text-text-muted mt-1">Rated contests will affect player rankings (not yet implemented).</p>
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-foreground">Description (Markdown)</label>
                        <MarkdownEditor value={editing.description} onChange={(val: string) => setEditing(s => s ? { ...s, description: val } : s)} placeholder="Write contest description..." height={400} />
                      </div>
                    </>
                  )}
                </div>
                <div className="px-5 py-3 border-t border-border flex justify-end gap-2">
                  <button onClick={closeEdit} className="px-4 py-1.5 rounded-md bg-surface-2 hover:bg-surface-3 text-sm font-medium text-foreground">Cancel</button>
                  <button onClick={saveEdit} disabled={!editing?.name.trim()} className="px-4 py-1.5 rounded-md bg-brand-primary text-white hover:bg-brand-secondary disabled:opacity-40 text-sm font-medium">Save Changes</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </ManagerGuard>
    </AuthGuard>
  );
}
