import { describe, expect, it } from 'vitest';
import { Request } from 'node-fetch';

import { GET as getPublicRecipes } from '@/pages/api/recipes/public';
import type { PublicRecipeDTO } from '@/types';
import { createSupabaseStub, type RecipeRow, type ProfileRow } from '../../utils/supabaseStub';

const buildRequest = (path = '/api/recipes/public') =>
  new Request(`http://localhost${path}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

const invokeEndpoint = (supabase: ReturnType<typeof createSupabaseStub>, path?: string) =>
  getPublicRecipes({
    request: buildRequest(path),
    locals: { supabase },
    params: {},
  } as any);

describe('GET /api/recipes/public', () => {
  it('returns published recipes with author metadata and pagination', async () => {
    const recipes: RecipeRow[] = [
      {
        id: 'recipe-1',
        title: 'Roasted Veggie Pasta',
        description: 'Weeknight dinner',
        servings: 4,
        prep_time: 15,
        cook_time: 25,
        image_url: null,
        published_at: '2025-11-01T12:00:00Z',
        user_id: 'user-1',
        is_public: true,
      },
      {
        id: 'recipe-2',
        title: 'Draft Recipe',
        description: null,
        servings: 2,
        prep_time: null,
        cook_time: null,
        image_url: null,
        published_at: null,
        user_id: 'user-1',
        is_public: false,
      },
    ];

    const profiles: ProfileRow[] = [
      {
        id: 'user-1',
        username: 'chef-amy',
        display_name: 'Chef Amy',
        avatar_url: null,
        created_at: '2025-01-01T00:00:00Z',
      },
    ];

    const supabase = createSupabaseStub({ recipes, profiles });

    const response = await invokeEndpoint(supabase);
    expect(response.status).toBe(200);

    const payload = (await response.json()) as { data: PublicRecipeDTO[]; pagination: { total: number } };
    expect(payload.data).toHaveLength(1);
    expect(payload.pagination.total).toBe(1);

    const [first] = payload.data;
    expect(first.title).toBe('Roasted Veggie Pasta');
    expect(first.author.username).toBe('chef-amy');
    expect(first.author.public_recipe_count).toBe(1);
  });

  it('returns 400 when sort parameter is invalid', async () => {
    const supabase = createSupabaseStub();

    const response = await invokeEndpoint(supabase, '/api/recipes/public?sort=bad');
    expect(response.status).toBe(400);

    const payload = (await response.json()) as { error: { code: string; message: string; field?: string } };
    expect(payload.error.code).toBe('VALIDATION_ERROR');
    expect(payload.error.field).toBe('sort');
  });

  it('returns an empty list when filtering by an unknown author', async () => {
    const supabase = createSupabaseStub({ recipes: [], profiles: [] });

    const response = await invokeEndpoint(supabase, '/api/recipes/public?author=missing');
    expect(response.status).toBe(200);

    const payload = (await response.json()) as { data: PublicRecipeDTO[]; pagination: { total: number } };
    expect(payload.data).toHaveLength(0);
    expect(payload.pagination.total).toBe(0);
  });

  it('returns 500 when Supabase profile lookup fails', async () => {
    const recipes: RecipeRow[] = [
      {
        id: 'recipe-3',
        title: 'Published',
        description: null,
        servings: 4,
        prep_time: null,
        cook_time: null,
        image_url: null,
        published_at: '2025-01-01T00:00:00Z',
        user_id: 'user-99',
        is_public: true,
      },
    ];

    const supabase = createSupabaseStub({
      recipes,
      profiles: [],
      errors: {
        profileList: new Error('profiles unavailable'),
      },
    });

    const response = await invokeEndpoint(supabase);
    expect(response.status).toBe(500);

    const payload = (await response.json()) as { error: { code: string; message: string } };
    expect(payload.error.code).toBe('INTERNAL_ERROR');
    expect(payload.error.message).toContain('Failed to fetch author information');
  });
});
