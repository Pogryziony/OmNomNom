import { describe, expect, it } from 'vitest';
import { makeAuthHeaders } from '@/lib/http';

describe('makeAuthHeaders', () => {
  it('returns empty headers when token missing', () => {
    expect(makeAuthHeaders()).toEqual({});
  });

  it('returns Authorization header when token provided', () => {
    expect(makeAuthHeaders('abc')).toEqual({ Authorization: 'Bearer abc' });
  });
});
