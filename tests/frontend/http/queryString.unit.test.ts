import { describe, expect, it } from 'vitest';
import { buildQueryString } from '@/lib/queryString';

describe('buildQueryString', () => {
  it('returns empty string when no params', () => {
    expect(buildQueryString({})).toBe('');
  });

  it('skips null and undefined', () => {
    expect(buildQueryString({ a: undefined, b: null, c: 'x' })).toBe('?c=x');
  });

  it('serializes numbers and booleans', () => {
    const qs = buildQueryString({ page: 2, limit: 10, is_public: false });
    expect(qs).toBe('?page=2&limit=10&is_public=false');
  });
});
