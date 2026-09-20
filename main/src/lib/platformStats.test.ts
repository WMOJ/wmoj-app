import assert from 'node:assert/strict';
import test from 'node:test';

import { ALLOWED_LANGUAGES } from '@/lib/languages';
import { countActiveLanguages, formatStatCount } from '@/lib/platformStats';

test('formatStatCount formats numbers with comma separators in US English locale', () => {
  assert.equal(formatStatCount(0), '0');
  assert.equal(formatStatCount(46), '46');
  assert.equal(formatStatCount(999), '999');
  assert.equal(formatStatCount(1000), '1,000');
  assert.equal(formatStatCount(5268), '5,268');
  assert.equal(formatStatCount(211091), '211,091');
  assert.equal(formatStatCount(7921700), '7,921,700');
});

test('formatStatCount handles non-integer, negative, and invalid values gracefully', () => {
  assert.equal(formatStatCount(1234.56), '1,234');
  assert.equal(formatStatCount(-1), '0');
  assert.equal(formatStatCount(-100), '0');
  assert.equal(formatStatCount(NaN), '0');
  assert.equal(formatStatCount(Infinity), '0');
  assert.equal(formatStatCount(-Infinity), '0');
});

test('countActiveLanguages counts languages that have at least one submission', () => {
  assert.equal(countActiveLanguages([5, 0, 10, 0], 8), 2);
  assert.equal(countActiveLanguages([null, 3, undefined, 0, 7], 8), 2);
  assert.equal(countActiveLanguages([1, 1, 1, 1], 8), 4);
});

test('countActiveLanguages falls back to default when no languages have submissions', () => {
  assert.equal(countActiveLanguages([0, 0, 0, 0], 8), 8);
  assert.equal(countActiveLanguages([null, undefined, 0], 6), 6);
  assert.equal(countActiveLanguages([], 8), 8);
  assert.equal(countActiveLanguages([]), ALLOWED_LANGUAGES.length);
});
