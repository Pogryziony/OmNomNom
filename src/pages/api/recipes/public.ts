/**
 * GET /api/recipes/public - Public Recipes Feed
 * 
 * Retrieves public recipes feed accessible to all users (authenticated and anonymous).
 * Supports pagination, search, filtering, and sorting.
 * 
 * @see .ai/api-plan.md - API specifications
 * @see src/types.ts - Type definitions
 */

import type { APIRoute } from 'astro';
import type {
  PublicRecipeDTO,
  PaginatedResponse,
  ApiErrorResponse,
  ApiErrorCode,
  PublicProfileDTO,
} from '@/types';

/**
 * Helper function to create JSON error responses
 */
function jsonError(
  code: ApiErrorCode,
  message: string,
  status: number,
  field?: string
): Response {
  const error: ApiErrorResponse = {
    error: {
      code,
      message,
      ...(field && { field }),
      details: {},
    },
  };
  return new Response(JSON.stringify(error), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * GET /api/recipes/public
 * 
 * Retrieves public recipes feed with pagination and filtering.
 * Accessible by authenticated and anonymous users.
 * Only returns recipes where is_public = true.
 */
export const GET: APIRoute = async ({ request, locals }) => {
  try {
    // Step 1: Parse and validate query parameters
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20')));
    const sort = url.searchParams.get('sort') || 'published_at';
    const order = url.searchParams.get('order') || 'desc';
    const search = url.searchParams.get('search')?.trim() || '';
    const author = url.searchParams.get('author')?.trim() || '';

    // Validate sort field
    const validSortFields = ['published_at', 'created_at', 'title'];
    if (!validSortFields.includes(sort)) {
      return jsonError(
        'VALIDATION_ERROR',
        `Invalid sort field. Must be one of: ${validSortFields.join(', ')}`,
        400,
        'sort'
      );
    }

    // Validate order
    if (order !== 'asc' && order !== 'desc') {
      return jsonError(
        'VALIDATION_ERROR',
        'Invalid order. Must be "asc" or "desc"',
        400,
        'order'
      );
    }

    // Step 2: Build query for public recipes
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // @ts-ignore - Database types not yet generated from schema
    let query = locals.supabase
      .from('recipes')
      .select('id, title, description, servings, prep_time, cook_time, image_url, published_at, user_id', { count: 'exact' })
      .eq('is_public', true);

    // Apply search filter (search in title)
    if (search) {
      query = query.ilike('title', `%${search}%`);
    }

    // Apply author filter
    if (author) {
      // First, get the user_id for the username
      // @ts-ignore - Database types not yet generated from schema
      const { data: profile, error: profileError } = await locals.supabase
        .from('profiles')
        .select('id')
        .eq('username', author)
        .single() as { data: { id: string } | null; error: any };

      if (profileError || !profile) {
        // If author not found, return empty results
        const emptyResponse: PaginatedResponse<PublicRecipeDTO> = {
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
            total_pages: 0,
          },
        };

        return new Response(JSON.stringify(emptyResponse), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }

      query = query.eq('user_id', profile.id);
    }

    // Apply sorting
    query = query.order(sort, { ascending: order === 'asc' });

    // Apply pagination
    query = query.range(from, to);

    const { data: recipes, error: queryError, count } = await query as { 
      data: Array<{
        id: string;
        title: string;
        description: string | null;
        servings: number;
        prep_time: number | null;
        cook_time: number | null;
        image_url: string | null;
        published_at: string | null;
        user_id: string;
      }> | null; 
      error: any; 
      count: number | null 
    };

    if (queryError) {
      console.error('Error fetching public recipes:', queryError);
      return jsonError(
        'INTERNAL_ERROR',
        'Failed to fetch public recipes',
        500
      );
    }

    // Step 3: Fetch author profiles for all recipes
    const userIds = [...new Set((recipes || []).map(r => r.user_id))];
    
    // @ts-ignore - Database types not yet generated from schema
    const { data: profiles, error: profilesError } = await locals.supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, created_at')
      .in('id', userIds) as { 
        data: Array<{
          id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
        }> | null; 
        error: any 
      };

    if (profilesError) {
      console.error('Error fetching author profiles:', profilesError);
      return jsonError(
        'INTERNAL_ERROR',
        'Failed to fetch author information',
        500
      );
    }

    // Step 3b: Get public recipe counts for each author
    const recipeCountsPromises = userIds.map(async (userId) => {
      // @ts-ignore - Database types not yet generated from schema
      const { count, error } = await locals.supabase
        .from('recipes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_public', true) as { count: number | null; error: any };

      return { userId, count: count || 0 };
    });

    const recipeCountsResults = await Promise.all(recipeCountsPromises);
    const recipeCountsMap = new Map(recipeCountsResults.map(r => [r.userId, r.count]));

    // Create a map of user_id to profile for quick lookup
    const profileMap = new Map(
      (profiles || []).map(p => [p.id, {
        username: p.username,
        display_name: p.display_name,
        avatar_url: p.avatar_url,
        created_at: p.created_at,
        public_recipe_count: recipeCountsMap.get(p.id) || 0,
      }])
    );

    // Step 4: Assemble PublicRecipeDTO objects
    const publicRecipes: PublicRecipeDTO[] = (recipes || [])
      .filter(recipe => recipe.published_at !== null) // Ensure published_at exists
      .map(recipe => {
        const authorProfile = profileMap.get(recipe.user_id);
        
        // Use fallback values for missing profile data
        const author: PublicProfileDTO = authorProfile || {
          username: 'unknown',
          display_name: null,
          avatar_url: null,
          created_at: new Date().toISOString(),
          public_recipe_count: 0,
        };
        
        return {
          id: recipe.id,
          title: recipe.title,
          description: recipe.description,
          servings: recipe.servings,
          prep_time: recipe.prep_time,
          cook_time: recipe.cook_time,
          image_url: recipe.image_url,
          published_at: recipe.published_at!, // Safe after filter
          author,
        };
      });

    // Step 5: Build paginated response
    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    const response: PaginatedResponse<PublicRecipeDTO> = {
      data: publicRecipes,
      pagination: {
        page,
        limit,
        total,
        total_pages: totalPages,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('GET /api/recipes/public unexpected error:', error);
    return jsonError(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      500
    );
  }
};
