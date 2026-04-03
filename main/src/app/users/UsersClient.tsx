'use client';

import { useMemo, useState } from 'react';

interface UserRow {
  id: string;
  username: string;
  problems_solved: number;
}

interface UsersClientProps {
  initialUsers: UserRow[];
  fetchError?: string;
}

export default function UsersClient({ initialUsers, fetchError }: UsersClientProps) {
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [search, setSearch] = useState('');

  const sortedUsers = useMemo(() => {
    const list = [...initialUsers].filter((u) =>
      u.username.toLowerCase().includes(search.toLowerCase())
    );
    list.sort((a, b) =>
      sortDir === 'desc'
        ? b.problems_solved - a.problems_solved
        : a.problems_solved - b.problems_solved
    );
    return list;
  }, [initialUsers, sortDir, search]);

  const toggleSort = () => setSortDir(d => (d === 'desc' ? 'asc' : 'desc'));

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Leaderboard</h1>
        
      </div>

      {fetchError && (
        <div className="bg-error/10 border border-error/20 rounded-lg p-4">
          <p className="text-sm text-error">{fetchError}</p>
        </div>
      )}

      <div className="flex justify-end">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by handle..."
          className="w-1/4 h-8 px-3 rounded-md bg-surface-1 border border-border text-sm text-foreground placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
        />
      </div>

      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-surface-2">
              <tr>
                <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-text-muted w-12 text-center">
                  #
                </th>
                <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-text-muted">
                  Username
                </th>
                <th
                  className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-text-muted w-32 text-right cursor-pointer select-none group"
                  onClick={toggleSort}
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Problems</span>
                    <span className="opacity-100">
                      {sortDir === 'desc' ? '↓' : '↑'}
                    </span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sortedUsers.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-10 text-center text-text-muted text-sm">
                    No users found.
                  </td>
                </tr>
              ) : (
                sortedUsers.map((user, index) => (
                  <tr key={user.id} className="hover:bg-surface-2 transition-colors">
                    <td className="px-4 py-3 text-sm text-text-muted font-mono text-center align-middle">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-foreground align-middle">
                      {user.username}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-foreground text-right align-middle">
                      {user.problems_solved}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
