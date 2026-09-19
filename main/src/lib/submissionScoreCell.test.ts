import assert from 'node:assert/strict';
import test from 'node:test';

import { getSubmissionScoreCell } from '@/lib/submissionScoreCell';

test('all test cases passed returns green success classes', () => {
  const cell = getSubmissionScoreCell({ passed: 15, total: 15 });
  assert.equal(cell.text, '15/15');
  assert.equal(cell.colorClass, 'bg-success/20 text-success');
  assert.equal(cell.kind, 'passed');
});

test('more passed than total (anomaly) returns green success classes', () => {
  const cell = getSubmissionScoreCell({ passed: 10, total: 8 });
  assert.equal(cell.text, '10/8');
  assert.equal(cell.colorClass, 'bg-success/20 text-success');
  assert.equal(cell.kind, 'passed');
});

test('partial passes return warning yellow/amber classes', () => {
  const cell = getSubmissionScoreCell({ passed: 7, total: 15 });
  assert.equal(cell.text, '7/15');
  assert.equal(cell.colorClass, 'bg-warning/20 text-warning');
  assert.equal(cell.kind, 'partial');
});

test('zero passed returns error red classes', () => {
  const cell = getSubmissionScoreCell({ passed: 0, total: 15 });
  assert.equal(cell.text, '0/15');
  assert.equal(cell.colorClass, 'bg-error/20 text-error');
  assert.equal(cell.kind, 'failed');
});

test('compile error returns CE with muted surface styling', () => {
  const cellByFlag = getSubmissionScoreCell({ isCompileError: true, passed: 0, total: 0 });
  assert.equal(cellByFlag.text, 'CE');
  assert.equal(cellByFlag.colorClass, 'bg-surface-3 text-text-muted');
  assert.equal(cellByFlag.kind, 'compile_error');

  const cellByVerdict = getSubmissionScoreCell({ verdict: 'CE', passed: 0, total: 0 });
  assert.equal(cellByVerdict.text, 'CE');
  assert.equal(cellByVerdict.colorClass, 'bg-surface-3 text-text-muted');
  assert.equal(cellByVerdict.kind, 'compile_error');
});

test('zero total or empty summary returns em-dash with surface-2 muted styling', () => {
  const empty = getSubmissionScoreCell({});
  assert.equal(empty.text, '—');
  assert.equal(empty.colorClass, 'bg-surface-2 text-text-muted');
  assert.equal(empty.kind, 'none');

  const zeroTotal = getSubmissionScoreCell({ passed: 0, total: 0 });
  assert.equal(zeroTotal.text, '—');
  assert.equal(zeroTotal.colorClass, 'bg-surface-2 text-text-muted');
  assert.equal(zeroTotal.kind, 'none');
});

test('counts formatted as strings are properly parsed', () => {
  const cell = getSubmissionScoreCell({ passed: '10', total: '10' });
  assert.equal(cell.text, '10/10');
  assert.equal(cell.colorClass, 'bg-success/20 text-success');
  assert.equal(cell.kind, 'passed');
});

test('fallback to score string if counts are missing or zero', () => {
  const cell = getSubmissionScoreCell({ score: '20/20' });
  assert.equal(cell.text, '20/20');
  assert.equal(cell.colorClass, 'bg-success/20 text-success');
  assert.equal(cell.kind, 'passed');

  const cellPartial = getSubmissionScoreCell({ score: '5/20', total: 0 });
  assert.equal(cellPartial.text, '5/20');
  assert.equal(cellPartial.colorClass, 'bg-warning/20 text-warning');
  assert.equal(cellPartial.kind, 'partial');
});

test('verdict TLE with partial passes sets warning styling', () => {
  const cell = getSubmissionScoreCell({ verdict: 'TLE', passed: 5, total: 10 });
  assert.equal(cell.text, '5/10');
  assert.equal(cell.colorClass, 'bg-warning/20 text-warning');
  assert.equal(cell.kind, 'partial');
});

test('verdict TLE with 0 passes returns failed styling', () => {
  const cell = getSubmissionScoreCell({ verdict: 'TLE', passed: 0, total: 10 });
  assert.equal(cell.text, '0/10');
  assert.equal(cell.colorClass, 'bg-error/20 text-error');
  assert.equal(cell.kind, 'failed');
});

test('negative total or counts do not evaluate as passed', () => {
  const cellNegativeTotal = getSubmissionScoreCell({ passed: 0, total: -5 });
  assert.equal(cellNegativeTotal.text, '—');
  assert.equal(cellNegativeTotal.colorClass, 'bg-surface-2 text-text-muted');
  assert.equal(cellNegativeTotal.kind, 'none');

  const cellNegativePassed = getSubmissionScoreCell({ passed: -2, total: 5 });
  assert.equal(cellNegativePassed.text, '0/5');
  assert.equal(cellNegativePassed.colorClass, 'bg-error/20 text-error');
  assert.equal(cellNegativePassed.kind, 'failed');
});

test('malformed or invalid types are rejected by parseCount', () => {
  // Whitespace, booleans, arrays are rejected rather than coerced to numbers
  const cellWhitespace = getSubmissionScoreCell({ passed: '   ', total: '   ' });
  assert.equal(cellWhitespace.text, '—');
  assert.equal(cellWhitespace.kind, 'none');

  // Multi-slash score string is rejected
  const cellMultiSlash = getSubmissionScoreCell({ score: '1/2/3' });
  assert.equal(cellMultiSlash.text, '—');
  assert.equal(cellMultiSlash.kind, 'none');
});

