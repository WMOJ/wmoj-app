'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { LoadingSpinner } from '@/components/AnimationWrapper';

export interface SearchableProblem {
  id: string;
  name: string;
  points: number | null;
}

interface ProblemSearchProps {
  searchEndpoint: string;
  accessToken: string | undefined;
  selectedProblems: SearchableProblem[];
  onSelectedChange: (problems: SearchableProblem[]) => void;
  excludeContest?: string;
}

const inputClass = "w-full h-10 px-3 bg-surface-2 border border-border rounded-md text-sm text-foreground placeholder-text-muted/50 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20";

export default function ProblemSearch({
  searchEndpoint,
  accessToken,
  selectedProblems,
  onSelectedChange,
  excludeContest,
}: ProblemSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchableProblem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedIds = new Set(selectedProblems.map(p => p.id));

  const search = useCallback(async (term: string) => {
    if (term.length < 1) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({ q: term });
      if (excludeContest) params.set('exclude_contest', excludeContest);

      const res = await fetch(`${searchEndpoint}?${params}`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });

      if (res.ok) {
        const json = await res.json();
        setResults(json.problems ?? []);
        setShowDropdown(true);
      }
    } catch {
      // silently fail search
    } finally {
      setLoading(false);
    }
  }, [searchEndpoint, accessToken, excludeContest]);

  useEffect(() => {
    if (debounceRef.current !== null) clearTimeout(debounceRef.current);
    if (query.trim().length < 1) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    debounceRef.current = setTimeout(() => search(query.trim()), 300);
    return () => { if (debounceRef.current !== null) clearTimeout(debounceRef.current); };
  }, [query, search]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const addProblem = (problem: SearchableProblem) => {
    if (!selectedIds.has(problem.id)) {
      onSelectedChange([...selectedProblems, problem]);
    }
  };

  const removeProblem = (id: string) => {
    onSelectedChange(selectedProblems.filter(p => p.id !== id));
  };

  const filteredResults = results.filter(r => !selectedIds.has(r.id));

  return (
    <div className="space-y-3">
      <div ref={containerRef} className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (filteredResults.length > 0) setShowDropdown(true); }}
          placeholder="Type to search for problems..."
          className={inputClass}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <LoadingSpinner size="sm" />
          </div>
        )}

        {showDropdown && (
          <div className="absolute z-10 w-full mt-1 bg-surface-2 border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
            {filteredResults.length > 0 ? (
              filteredResults.map(problem => (
                <button
                  key={problem.id}
                  type="button"
                  onClick={() => addProblem(problem)}
                  className="w-full px-3 py-2 text-left hover:bg-surface-3 flex items-center justify-between gap-2 text-sm"
                >
                  <span className="text-foreground truncate">{problem.name}</span>
                  <span className="text-text-muted text-xs shrink-0">
                    {problem.points != null && <span>{problem.points} pts</span>}
                  </span>
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-text-muted">No matching problems found</div>
            )}
          </div>
        )}
      </div>

      {selectedProblems.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedProblems.map(problem => (
            <span
              key={problem.id}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-surface-3 border border-border rounded-md text-sm text-foreground"
            >
              <span className="truncate max-w-[200px]">{problem.name}</span>
              <button
                type="button"
                onClick={() => removeProblem(problem.id)}
                className="text-text-muted hover:text-error shrink-0"
                aria-label={`Remove ${problem.name}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
