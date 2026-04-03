'use client';

import { useMemo, useState } from 'react';
import type { SubmissionRow, SubmissionStats } from './page';

interface Props {
  initialSubmissions: SubmissionRow[];
  stats: SubmissionStats;
  fetchError?: string;
}

// ─── Relative time ────────────────────────────────────────────────────────────

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ─── Language label ───────────────────────────────────────────────────────────

function languageLabel(lang: string): string {
  if (lang === 'cpp') return 'C++';
  if (lang === 'python') return 'Python';
  if (lang === 'java') return 'Java';
  return lang.toUpperCase();
}

// ─── Pie Chart ────────────────────────────────────────────────────────────────

const PIE_SLICES = [
  { key: 'passed' as const,        label: 'Passed',        color: '#16a34a' },
  { key: 'failed' as const,        label: 'Failed',        color: '#dc2626' },
  { key: 'timeout' as const,       label: 'Timeout',       color: '#ca8a04' },
  { key: 'compile_error' as const, label: 'Compile Error', color: '#7c3aed' },
  { key: 'error' as const,         label: 'Error',         color: '#6b7280' },
];

function PieChart({ stats }: { stats: SubmissionStats }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const cx = 80;
  const cy = 80;
  const r = 68;
  const total = stats.total;

  // Build slices
  const slices = useMemo(() => {
    if (total === 0) return [];
    let cumAngle = -Math.PI / 2; // start at top
    return PIE_SLICES.filter((s) => stats[s.key] > 0).map((s) => {
      const fraction = stats[s.key] / total;
      const startAngle = cumAngle;
      const endAngle = cumAngle + fraction * 2 * Math.PI;
      cumAngle = endAngle;

      const x1 = cx + r * Math.cos(startAngle);
      const y1 = cy + r * Math.sin(startAngle);
      const x2 = cx + r * Math.cos(endAngle);
      const y2 = cy + r * Math.sin(endAngle);
      const largeArc = fraction > 0.5 ? 1 : 0;

      const d =
        fraction >= 0.9999
          ? // Full circle — draw as two arcs
            `M ${cx},${cy - r} A ${r},${r} 0 1,1 ${cx - 0.001},${cy - r} Z`
          : `M ${cx},${cy} L ${x1},${y1} A ${r},${r} 0 ${largeArc},1 ${x2},${y2} Z`;

      return { ...s, d, count: stats[s.key] };
    });
  }, [stats, total]);

  if (total === 0) {
    return <p className="text-sm text-text-muted text-center py-4">No submissions yet.</p>;
  }

  return (
    <div className="relative flex flex-col items-center gap-3">
      <svg
        width={160}
        height={160}
        viewBox="0 0 160 160"
        className="overflow-visible"
      >
        {slices.map((slice) => (
          <path
            key={slice.key}
            d={slice.d}
            fill={slice.color}
            stroke="white"
            strokeWidth={1.5}
            className="cursor-pointer transition-opacity"
            style={{ opacity: hovered && hovered !== slice.key ? 0.5 : 1 }}
            onMouseEnter={(e) => {
              setHovered(slice.key);
              const rect = (e.target as SVGElement).closest('svg')!.getBoundingClientRect();
              setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
            }}
            onMouseMove={(e) => {
              const rect = (e.target as SVGElement).closest('svg')!.getBoundingClientRect();
              setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
            }}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
      </svg>

      {/* Tooltip */}
      {hovered && (() => {
        const slice = slices.find((s) => s.key === hovered);
        if (!slice) return null;
        return (
          <div
            className="absolute pointer-events-none z-20 bg-foreground text-background text-xs font-medium px-2 py-1 rounded-md shadow-lg whitespace-nowrap"
            style={{
              left: tooltipPos.x + 10,
              top: tooltipPos.y - 28,
              transform: 'translateX(-50%)',
            }}
          >
            {slice.label}: {slice.count}
          </div>
        );
      })()}

      {/* Legend */}
      <div className="w-full space-y-1">
        {slices.map((slice) => (
          <div key={slice.key} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: slice.color }} />
              <span className="text-text-muted">{slice.label}</span>
            </div>
            <span className="font-mono text-foreground">{slice.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SubmissionsClient({ initialSubmissions, stats, fetchError }: Props) {
  const [problemSearch, setProblemSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'passed' | 'failed'>('all');

  const filtered = useMemo(() => {
    return initialSubmissions.filter((s) => {
      if (problemSearch && !s.problem_name.toLowerCase().includes(problemSearch.toLowerCase())) return false;
      if (userSearch && !s.username.toLowerCase().includes(userSearch.toLowerCase())) return false;
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      return true;
    });
  }, [initialSubmissions, problemSearch, userSearch, statusFilter]);

  const inputClass =
    'w-full h-9 px-3 rounded-md bg-surface-2 border border-border text-sm text-foreground placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary';

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Submissions</h1>
        
      </div>

      {fetchError && (
        <div className="bg-error/10 border border-error/20 rounded-lg p-4">
          <p className="text-sm text-error">{fetchError}</p>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* ── Main Table ───────────────────────────────────────────────── */}
        <div className="flex-[3] min-w-0">
          <div className="glass-panel overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">
                {filtered.length} submission{filtered.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left border-collapse">
                <thead className="sticky top-0 z-10 bg-surface-2">
                  <tr>
                    <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-text-muted w-20 text-center">
                      Result
                    </th>
                    <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-text-muted">
                      Submission
                    </th>
                    <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-text-muted w-24 text-right">
                      Language
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-10 text-center text-text-muted text-sm">
                        No submissions match your filters.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((sub) => {
                      const allPassed = sub.passed === sub.total && sub.total > 0;
                      const somePassed = sub.passed > 0 && !allPassed;

                      const scoreColorClass = allPassed
                        ? 'bg-success/10 text-success border border-success/20'
                        : somePassed
                        ? 'bg-warning/10 text-warning border border-warning/20'
                        : 'bg-error/10 text-error border border-error/20';

                      return (
                        <tr key={sub.id} className="hover:bg-surface-2 transition-colors">
                          {/* Score block */}
                          <td className="px-3 py-3 align-middle">
                            <div className={`rounded-md px-2 py-1.5 text-center ${scoreColorClass}`}>
                              <div className="text-xs font-mono font-semibold leading-tight">
                                {sub.passed}/{sub.total}
                              </div>
                            </div>
                          </td>

                          {/* Problem + User + Time */}
                          <td className="px-4 py-3 align-middle">
                            <div className="text-sm font-medium text-foreground leading-tight">
                              {sub.problem_name}
                            </div>
                            <div className="text-xs text-text-muted mt-0.5">
                              <span>{sub.username}</span>
                              <span className="mx-1.5">·</span>
                              <span>{formatRelativeTime(sub.created_at)}</span>
                            </div>
                          </td>

                          {/* Language */}
                          <td className="px-4 py-3 align-middle text-right">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-surface-2 text-text-muted border border-border">
                              {languageLabel(sub.language)}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── Sidebar ──────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Filter card */}
          <div className="glass-panel p-4 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Filter Submissions</h3>

            <div className="space-y-1">
              <label className="text-xs font-medium text-text-muted uppercase tracking-wide">Problem</label>
              <input
                value={problemSearch}
                onChange={(e) => setProblemSearch(e.target.value)}
                placeholder="Search problems..."
                className={inputClass}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-text-muted uppercase tracking-wide">Username</label>
              <input
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search users..."
                className={inputClass}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-text-muted uppercase tracking-wide">Status</label>
              <div className="flex rounded-md overflow-hidden border border-border text-xs font-medium">
                {(['all', 'passed', 'failed'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`flex-1 py-1.5 capitalize transition-colors ${
                      statusFilter === s
                        ? 'bg-brand-primary text-white'
                        : 'bg-surface-2 text-text-muted hover:text-foreground hover:bg-surface-3'
                    }`}
                  >
                    {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Statistics card */}
          <div className="glass-panel p-4 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Statistics</h3>
            <PieChart stats={stats} />
            <p className="text-xs text-text-muted text-center font-mono">
              Total: {stats.total}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
