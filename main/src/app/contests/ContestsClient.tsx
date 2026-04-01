'use client';

import { useEffect, useState, useMemo } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import DataTable, { type DataTableColumn } from '@/components/DataTable';
import { Contest, ContestStatus } from '@/types/contest';
import { Badge } from '@/components/ui/Badge';
import { getContestStatus, formatTimeUntil } from '@/utils/contestStatus';

interface ContestsClientProps {
  initialContests: Contest[];
  fetchError?: string;
}

const STATUS_VARIANT: Record<ContestStatus, 'success' | 'info' | 'warning' | 'neutral'> = {
  ongoing:  'success',
  upcoming: 'info',
  virtual:  'warning',
  inactive: 'neutral',
};

const STATUS_LABEL: Record<ContestStatus, string> = {
  ongoing:  'Ongoing',
  upcoming: 'Upcoming',
  virtual:  'Virtual',
  inactive: 'Inactive',
};

const STATUS_SORT_ORDER: Record<ContestStatus, number> = {
  ongoing: 3, upcoming: 2, virtual: 1, inactive: 0,
};

export default function ContestsClient({ initialContests, fetchError }: ContestsClientProps) {
  const { session } = useAuth();
  const [contests] = useState<Contest[]>(initialContests);
  const [joinedContestId, setJoinedContestId] = useState<string | null>(null);
  const [joinedHistory, setJoinedHistory] = useState<Set<string>>(new Set());
  const [virtualContestIds, setVirtualContestIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  const fetcher = (url: string) => fetch(url, { headers: { 'Authorization': `Bearer ${session?.access_token}` } }).then(r => r.json());

  const { data: participation } = useSWR(session?.access_token ? '/api/contests/participation' : null, fetcher);
  const { data: joinHistory } = useSWR(session?.access_token ? '/api/contests/join-history' : null, fetcher);

  useEffect(() => {
    if (participation?.contest_id) setJoinedContestId(participation.contest_id);
  }, [participation]);

  useEffect(() => {
    if (joinHistory?.contest_ids && Array.isArray(joinHistory.contest_ids)) {
      setJoinedHistory(new Set(joinHistory.contest_ids));
    }
    if (joinHistory?.virtual_contest_ids && Array.isArray(joinHistory.virtual_contest_ids)) {
      setVirtualContestIds(new Set(joinHistory.virtual_contest_ids));
    }
  }, [joinHistory]);

  const filteredContests = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contests;
    return contests.filter(c => c.name.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q));
  }, [contests, search]);

  const columns: Array<DataTableColumn<Contest>> = [
    {
      key: 'name', header: 'Contest', className: 'w-[35%]', sortable: true, sortAccessor: (r) => (r.name || '').toLowerCase(), render: (r) => (
        <div className="flex items-center gap-2">
          <span className="text-foreground font-medium text-sm">{r.name || 'Untitled Contest'}</span>
          {(r.problems_count ?? 0) > 0 && <Badge variant="neutral">{r.problems_count} problem{(r.problems_count ?? 0) === 1 ? '' : 's'}</Badge>}
        </div>
      )
    },
    { key: 'length', header: 'Duration', className: 'w-[13%]', sortable: true, sortAccessor: (r) => r.length, render: (r) => <span className="text-sm text-foreground">{r.length} min</span> },
    {
      key: 'status', header: 'Status', className: 'w-[15%]', sortable: true,
      sortAccessor: (r) => STATUS_SORT_ORDER[getContestStatus(r)],
      render: (r) => {
        const s = getContestStatus(r);
        const timeHint =
          s === 'upcoming' && r.starts_at ? formatTimeUntil(r.starts_at) :
          s === 'ongoing'  && r.ends_at   ? formatTimeUntil(r.ends_at)   :
          null;
        return (
          <div className="flex flex-col gap-0.5">
            <Badge variant={STATUS_VARIANT[s]}>{STATUS_LABEL[s]}</Badge>
            {timeHint && (
              <span className="text-xs text-text-muted">
                {s === 'upcoming' ? 'Starts ' : 'Ends '}{timeHint}
              </span>
            )}
          </div>
        );
      }
    },
    { key: 'participants', header: 'Participants', className: 'w-[13%]', sortable: true, sortAccessor: (r) => r.participants_count ?? 0, render: (r) => <span className="text-sm text-text-muted">{r.participants_count ?? 0}</span> },
    {
      key: 'actions', header: '', className: 'w-[24%] text-right', render: (r) => {
        const status = getContestStatus(r);

        // User is currently in this contest
        if (joinedContestId === r.id) {
          return <Link href={`/contests/${r.id}`} className="text-sm font-medium text-brand-primary hover:text-brand-secondary">Continue →</Link>;
        }

        // Inactive contests — no action
        if (status === 'inactive') {
          return <span className="text-sm text-text-muted">Inactive</span>;
        }

        // User has join history for this contest
        if (joinedHistory.has(r.id)) {
          // All past joins were virtual and contest is still virtual → allow rejoin
          if (status === 'virtual' && virtualContestIds.has(r.id)) {
            return <Link href={`/contests/${r.id}/view`} className="text-sm font-medium text-brand-primary hover:text-brand-secondary">Rejoin →</Link>;
          }
          // Has a regular (non-virtual) join → spectate only
          return <Link href={`/contests/${r.id}/leaderboard`} className="text-sm font-medium text-text-muted hover:text-foreground">Spectate</Link>;
        }

        // Default: view the contest info / join page
        return <Link href={`/contests/${r.id}/view`} className="text-sm font-medium text-brand-primary hover:text-brand-secondary">View →</Link>;
      }
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground mb-1">Contests</h1>
        <p className="text-sm text-text-muted">Browse and join available contests</p>
      </div>

      {fetchError ? (
        <div className="bg-error/10 border border-error/20 rounded-lg p-4">
          <p className="text-sm text-error">{fetchError}</p>
        </div>
      ) : (
        <div className="glass-panel p-6">
          {contests.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-base font-medium text-foreground mb-1">No Contests Available</h3>
              <p className="text-sm text-text-muted">Check back later.</p>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search contests..."
                  className="w-full max-w-xs h-9 px-3 rounded-lg bg-surface-2 border border-border text-sm text-foreground placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                />
              </div>
              {filteredContests.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-text-muted">No contests match your search.</p>
                </div>
              ) : (
                <DataTable<Contest> columns={columns} rows={filteredContests} rowKey={(r) => r.id} headerVariant="gray" />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
