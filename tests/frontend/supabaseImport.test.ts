import { describe, expect, it } from 'vitest';

describe('supabase client module', () => {
  it('imports without throwing', async () => {
    const mod = await import('@/lib/supabase');
    expect(mod.supabase).toBeDefined();
  });
});
