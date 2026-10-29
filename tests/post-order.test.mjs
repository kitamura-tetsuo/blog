import test from 'node:test';
import assert from 'node:assert/strict';
import { newestFirst } from '../src/lib/post-order.mjs';

const post = (id, date, extra = {}) => ({ id, data: { date: new Date(date), ...extra } });
const ids = posts => posts.sort(newestFirst).map(p => p.id);

test('sorts same-day publications by time, independent of input order', () => {
  assert.deepEqual(ids([
    post('morning', '2026-10-29', { publishedAt: '2026-10-29T09:00:00Z' }),
    post('evening', '2026-10-29', { publishedAt: '2026-10-29T19:00:00Z' }),
    post('noon', '2026-10-29', { publishedAt: '2026-10-29T12:00:00Z' }),
  ]), ['evening', 'noon', 'morning']);
});

test('compares absolute instants across offsets and date boundaries', () => {
  assert.deepEqual(ids([
    post('later', '2026-10-29', { publishedAt: '2026-10-29T23:30:00-04:00' }),
    post('earlier', '2026-10-30', { publishedAt: '2026-10-30T08:00:00+09:00' }),
  ]), ['later', 'earlier']);
});

test('uses documented first merge only as a fallback and keeps ties deterministic', () => {
  assert.deepEqual(ids([
    post('z', '2026-10-29', { firstMergedAt: '2026-10-29T04:00:00Z' }),
    post('a', '2026-10-29', { firstMergedAt: '2026-10-29T04:00:00Z' }),
    post('new', '2026-10-29', { firstMergedAt: '2026-10-29T05:00:00Z' }),
    post('exact', '2026-10-29', { firstMergedAt: '2026-10-29T01:00:00Z', publishedAt: '2026-10-29T06:00:00Z' }),
  ]), ['exact', 'new', 'a', 'z']);
});

test('date-only entries fall back to their date without invented time', () => {
  assert.deepEqual(ids([post('older', '2026-10-28'), post('newer', '2026-10-29')]), ['newer', 'older']);
});


test('the introduction is oldest among articles with the shared first-merge time in both locales', () => {
  for (const locale of ['en', 'ja']) {
    const merged = '2026-10-27T23:02:49Z';
    const entries = [
      post(`auto-coder/hello-${locale}`, '2026-10-28', { firstMergedAt: merged, orderWithinTimestamp: -1 }),
      post(`auto-coder/management-update-${locale}`, '2026-10-27', { firstMergedAt: merged }),
      post(`auto-coder/runtime-evidence-${locale}`, '2026-10-27', { firstMergedAt: merged }),
    ];
    assert.equal(ids(entries).at(-1), `auto-coder/hello-${locale}`);
  }
});

test('relative tie order does not override a genuinely later timestamp', () => {
  assert.deepEqual(ids([
    post('intro', '2026-10-28', { publishedAt: '2026-10-28T12:00:00Z', orderWithinTimestamp: -1 }),
    post('earlier', '2026-10-28', { publishedAt: '2026-10-28T11:00:00Z' }),
  ]), ['intro', 'earlier']);
});
