import { describe, expect, it } from 'vitest';
import { isOwner } from '@/lib/ownership';

describe('isOwner', () => {
  it('returns true when ids match', () => {
    expect(isOwner('u1', 'u1')).toBe(true);
  });

  it('returns false when ids differ', () => {
    expect(isOwner('u1', 'u2')).toBe(false);
  });

  it('returns false when missing values', () => {
    expect(isOwner(undefined, 'u1')).toBe(false);
    expect(isOwner('u1', undefined)).toBe(false);
  });
});
