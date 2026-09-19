/**
 * Pure helper for classifying submission scores into colored table cell properties.
 * Used across public and staff submission lists to render edge-to-edge square cells.
 */

export interface SubmissionScoreCellInput {
  passed?: number | string | null;
  total?: number | string | null;
  score?: string | null;
  isCompileError?: boolean | null;
  verdict?: string | null;
}

export type SubmissionScoreCellKind = 'passed' | 'partial' | 'failed' | 'compile_error' | 'none';

export interface SubmissionScoreCellResult {
  text: string;
  colorClass: string;
  kind: SubmissionScoreCellKind;
}

function parseCount(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') {
    return Number.isInteger(value) && value >= 0 ? value : null;
  }
  if (typeof value === 'string') {
    const s = value.trim();
    if (!/^\d+$/.test(s)) return null;
    const n = Number(s);
    return Number.isSafeInteger(n) && n >= 0 ? n : null;
  }
  return null;
}

/**
 * Classifies a submission outcome into display text and Tailwind classes for a full-cell color.
 */
export function getSubmissionScoreCell(input: SubmissionScoreCellInput): SubmissionScoreCellResult {
  const { isCompileError, verdict } = input;

  if (isCompileError || verdict === 'CE') {
    return {
      text: 'CE',
      colorClass: 'bg-surface-3 text-text-muted',
      kind: 'compile_error',
    };
  }

  let passed = parseCount(input.passed);
  let total = parseCount(input.total);

  // If passed/total were not provided as discrete counts, attempt to parse from "P/T" score string
  if ((total === null || total === 0) && input.score && input.score.includes('/')) {
    const parts = input.score.split('/');
    if (parts.length === 2) {
      const parsedP = parseCount(parts[0]);
      const parsedT = parseCount(parts[1]);
      if (parsedT !== null && parsedT > 0) {
        passed = parsedP ?? 0;
        total = parsedT;
      }
    }
  }

  const p = passed ?? 0;
  const t = total ?? 0;

  if (t <= 0) {
    return {
      text: '—',
      colorClass: 'bg-surface-2 text-text-muted',
      kind: 'none',
    };
  }

  if (p >= t) {
    return {
      text: `${p}/${t}`,
      colorClass: 'bg-success/20 text-success',
      kind: 'passed',
    };
  }

  if (p > 0) {
    return {
      text: `${p}/${t}`,
      colorClass: 'bg-warning/20 text-warning',
      kind: 'partial',
    };
  }

  return {
    text: `${p}/${t}`,
    colorClass: 'bg-error/20 text-error',
    kind: 'failed',
  };
}
