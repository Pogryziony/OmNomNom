/**
 * POST /api/recipes - Create Recipe Endpoint
 * 
 * Creates a new private recipe for the authenticated user with normalized ingredients.
 * Ingredients are deduplicated against master ingredients table.
 * 
 * @see .ai/view-implementation-plan.md - Implementation plan
 * @see src/types.ts - Type definitions
 */

import type { APIRoute } from 'astro';
import type {
  CreateRecipeCommand,
  RecipeDTO,
  ApiErrorResponse,
  ApiErrorCode,
  RecipeIngredientInput,
  IngredientEntity,
  RecipeEntity,
  RecipeIngredientEntity,
  PublicProfileDTO,
  RecipeIngredientWithDetails,
  PaginatedResponse,
  RecipeListItemDTO,
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
 * Validation result type
 */
interface ValidationResult {
  ok: boolean;
  message?: string;
  field?: string;
}

/**
 * Validates CreateRecipeCommand payload against API specification constraints
 * 
 * Validation rules from API plan:
 * - title: required, 1-200 characters
 * - instructions: required, non-empty
 * - servings: required, must be > 0
 * - prep_time: optional, must be >= 0 if provided
 * - cook_time: optional, must be >= 0 if provided
 * - description: optional, max 5000 characters
 * - ingredients: required, non-empty array
 * - Each ingredient:
 *   - ingredient_name: required, non-empty
 *   - unit: required, non-empty
 *   - order_index: required, must be >= 0
 *   - quantity: if quantity_display not provided, must be > 0
 */
function validateCreateRecipe(body: unknown): ValidationResult {
  // Type guard: ensure body is an object
  if (!body || typeof body !== 'object') {
    return { ok: false, message: 'Request body must be a JSON object' };
  }

  const data = body as Partial<CreateRecipeCommand>;

  // Validate title
  if (!data.title || typeof data.title !== 'string') {
    return { ok: false, message: 'Title is required', field: 'title' };
  }
  const titleTrimmed = data.title.trim();
  if (titleTrimmed.length === 0) {
    return { ok: false, message: 'Title cannot be empty', field: 'title' };
  }
  if (titleTrimmed.length > 200) {
    return {
      ok: false,
      message: 'Title must be 1-200 characters',
      field: 'title',
    };
  }

  // Validate instructions
  if (!data.instructions || typeof data.instructions !== 'string') {
    return {
      ok: false,
      message: 'Instructions are required',
      field: 'instructions',
    };
  }
  if (data.instructions.trim().length === 0) {
    return {
      ok: false,
      message: 'Instructions cannot be empty',
      field: 'instructions',
    };
  }

  // Validate servings
  if (typeof data.servings !== 'number') {
    return {
      ok: false,
      message: 'Servings must be a number',
      field: 'servings',
    };
  }
  if (data.servings <= 0) {
    return {
      ok: false,
      message: 'Servings must be greater than 0',
      field: 'servings',
    };
  }

  // Validate optional prep_time
  if (data.prep_time !== undefined && data.prep_time !== null) {
    if (typeof data.prep_time !== 'number') {
      return {
        ok: false,
        message: 'Prep time must be a number',
        field: 'prep_time',
      };
    }
    if (data.prep_time < 0) {
      return {
        ok: false,
        message: 'Prep time must be 0 or greater',
        field: 'prep_time',
      };
    }
  }

  // Validate optional cook_time
  if (data.cook_time !== undefined && data.cook_time !== null) {
    if (typeof data.cook_time !== 'number') {
      return {
        ok: false,
        message: 'Cook time must be a number',
        field: 'cook_time',
      };
    }
    if (data.cook_time < 0) {
      return {
        ok: false,
        message: 'Cook time must be 0 or greater',
        field: 'cook_time',
      };
    }
  }

  // Validate optional description
  if (data.description !== undefined && data.description !== null) {
    if (typeof data.description !== 'string') {
      return {
        ok: false,
        message: 'Description must be a string',
        field: 'description',
      };
    }
    if (data.description.length > 5000) {
      return {
        ok: false,
        message: 'Description cannot exceed 5000 characters',
        field: 'description',
      };
    }
  }

  // Validate ingredients array
  if (!Array.isArray(data.ingredients)) {
    return {
      ok: false,
      message: 'Ingredients must be an array',
      field: 'ingredients',
    };
  }
  if (data.ingredients.length === 0) {
    return {
      ok: false,
      message: 'At least one ingredient is required',
      field: 'ingredients',
    };
  }

  // Validate each ingredient
  for (let i = 0; i < data.ingredients.length; i++) {
    const ing = data.ingredients[i] as Partial<RecipeIngredientInput>;

    // ingredient_name
    if (!ing.ingredient_name || typeof ing.ingredient_name !== 'string') {
      return {
        ok: false,
        message: `Ingredient ${i + 1}: ingredient_name is required`,
        field: `ingredients[${i}].ingredient_name`,
      };
    }
    if (ing.ingredient_name.trim().length === 0) {
      return {
        ok: false,
        message: `Ingredient ${i + 1}: ingredient_name cannot be empty`,
        field: `ingredients[${i}].ingredient_name`,
      };
    }

    // unit
    if (!ing.unit || typeof ing.unit !== 'string') {
      return {
        ok: false,
        message: `Ingredient ${i + 1}: unit is required`,
        field: `ingredients[${i}].unit`,
      };
    }
    if (ing.unit.trim().length === 0) {
      return {
        ok: false,
        message: `Ingredient ${i + 1}: unit cannot be empty`,
        field: `ingredients[${i}].unit`,
      };
    }

    // order_index
    if (typeof ing.order_index !== 'number') {
      return {
        ok: false,
        message: `Ingredient ${i + 1}: order_index must be a number`,
        field: `ingredients[${i}].order_index`,
      };
    }
    if (ing.order_index < 0) {
      return {
        ok: false,
        message: `Ingredient ${i + 1}: order_index must be 0 or greater`,
        field: `ingredients[${i}].order_index`,
      };
    }

    // quantity validation: if quantity_display not provided, quantity must be > 0
    if (!ing.quantity_display) {
      if (typeof ing.quantity !== 'number') {
        return {
          ok: false,
          message: `Ingredient ${i + 1}: quantity is required when quantity_display is not provided`,
          field: `ingredients[${i}].quantity`,
        };
      }
      if (ing.quantity <= 0) {
        return {
          ok: false,
          message: `Ingredient ${i + 1}: quantity must be greater than 0`,
          field: `ingredients[${i}].quantity`,
        };
      }
    }
  }

  return { ok: true };
}

/**
 * Normalizes ingredient name to lowercase and trimmed
 * Used for deduplication in ingredients table
 */
function normalizeIngredientName(name: string): string {
  return name.toLowerCase().trim();
}

/**
 * Converts ingredient name to Title Case for display
 * Example: "fresh basil" -> "Fresh Basil"
 */
function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Resolved ingredient with ID from database
 */
interface ResolvedIngredient {
  id: string;
  input: RecipeIngredientInput;
}

/**
 * Upserts ingredients to master ingredients table
 * Normalizes names to lowercase for deduplication
 * Creates display names in Title Case
 * 
 * @param supabase - Supabase client
 * @param inputs - Array of ingredient inputs from request
 * @returns Array of resolved ingredients with IDs
 */
async function upsertIngredients(
  supabase: any,
  inputs: RecipeIngredientInput[]
): Promise<ResolvedIngredient[]> {
  const resolved: ResolvedIngredient[] = [];

  for (const input of inputs) {
    const normalizedName = normalizeIngredientName(input.ingredient_name);
    const displayName = toTitleCase(input.ingredient_name);

    // Upsert ingredient (insert or return existing)
    // @ts-ignore - Database types not yet generated from schema
    const { data, error } = await supabase
      .from('ingredients')
      .upsert(
        {
          name: normalizedName,
          display_name: displayName,
          category: null, // Category will be added post-MVP
        },
        {
          onConflict: 'name',
          ignoreDuplicates: false,
        }
      )
      .select('*')
      .single() as { data: IngredientEntity | null; error: any };

    if (error) {
      throw new Error(`Failed to upsert ingredient "${input.ingredient_name}": ${error.message}`);
    }

    if (!data) {
      throw new Error(`No data returned from ingredient upsert for "${input.ingredient_name}"`);
    }

    resolved.push({
      id: data.id,
      input,
    });
  }

  return resolved;
}

/**
 * GET /api/recipes - List Own Recipes
 * 
 * Retrieves authenticated user's recipes (private and public) with pagination,
 * search, sort, and filter capabilities.
 * 
 * Query Parameters:
 * - page (number, default: 1): Page number
 * - limit (number, default: 20, max: 100): Items per page
 * - sort (string, default: "created_at"): Sort field
 * - order (string, default: "desc"): Sort order (asc/desc)
 * - search (string, optional): Search by title
 * - is_public (boolean, optional): Filter by visibility
 */
export const GET: APIRoute = async ({ request, locals }) => {
  try {
    // Step 1: Authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return jsonError(
        'AUTHENTICATION_ERROR',
        'Missing or invalid authorization header',
        401
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await locals.supabase.auth.getUser(token);

    if (authError || !user) {
      return jsonError(
        'AUTHENTICATION_ERROR',
        'Invalid or expired token',
        401
      );
    }

    // Step 2: Parse and validate query parameters
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20')));
    const sort = url.searchParams.get('sort') || 'created_at';
    const order = url.searchParams.get('order') || 'desc';
    const search = url.searchParams.get('search')?.trim() || '';
    const isPublicParam = url.searchParams.get('is_public');

    // Validate sort field
    const validSortFields = ['created_at', 'updated_at', 'title'];
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

    // Step 3: Build query
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // @ts-ignore - Database types not yet generated from schema
    let query = locals.supabase
      .from('recipes')
      .select('id, title, description, servings, prep_time, cook_time, image_url, is_public, created_at, updated_at', { count: 'exact' })
      .eq('user_id', user.id);

    // Apply search filter
    if (search) {
      query = query.ilike('title', `%${search}%`);
    }

    // Apply visibility filter
    if (isPublicParam !== null) {
      const isPublic = isPublicParam === 'true';
      query = query.eq('is_public', isPublic);
    }

    // Apply sorting
    query = query.order(sort, { ascending: order === 'asc' });

    // Apply pagination
    query = query.range(from, to);

    const { data: recipes, error: queryError, count } = await query as { 
      data: RecipeListItemDTO[] | null; 
      error: any; 
      count: number | null 
    };

    if (queryError) {
      console.error('Error fetching recipes:', queryError);
      return jsonError(
        'INTERNAL_ERROR',
        'Failed to fetch recipes',
        500
      );
    }

    // Step 4: Build paginated response
    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    const response: PaginatedResponse<RecipeListItemDTO> = {
      data: recipes || [],
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
    console.error('GET /api/recipes unexpected error:', error);
    return jsonError(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      500
    );
  }
};

/**
 * POST /api/recipes
 * 
 * Creates a new private recipe for the authenticated user
 * 
 * @param request - Astro API request
 * @param locals - Astro context locals (includes supabase client)
 * @returns 201 with RecipeDTO on success, error response otherwise
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Step 1: Authentication - Extract and validate JWT token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonError(
        'AUTHENTICATION_ERROR',
        'Missing or invalid Authorization header',
        401
      );
    }

    const token = authHeader.slice('Bearer '.length);
    const {
      data: { user },
      error: userErr,
    } = await locals.supabase.auth.getUser(token);

    if (userErr || !user) {
      console.error('Auth error:', userErr);
      return jsonError(
        'AUTHENTICATION_ERROR',
        'Invalid or expired token',
        401
      );
    }

    // Step 2: Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch (parseErr) {
      return jsonError(
        'VALIDATION_ERROR',
        'Invalid JSON in request body',
        400
      );
    }

    const validation = validateCreateRecipe(body);
    if (!validation.ok) {
      return jsonError(
        'VALIDATION_ERROR',
        validation.message || 'Validation failed',
        400,
        validation.field
      );
    }

    const data = body as CreateRecipeCommand;

    // Step 3: Insert recipe into database
    const recipeInsert = {
      user_id: user.id,
      title: data.title.trim(),
      description: data.description?.trim() || null,
      instructions: data.instructions.trim(),
      servings: data.servings,
      prep_time: data.prep_time ?? null,
      cook_time: data.cook_time ?? null,
      image_url: data.image_url?.trim() || null,
      is_public: false, // Default to private
    };

    // @ts-ignore - Database types not yet generated from schema
    const {
      data: recipe,
      error: recipeError,
    } = await locals.supabase
      .from('recipes')
      .insert(recipeInsert)
      .select('*')
      .single() as { data: RecipeEntity | null; error: any };

    if (recipeError || !recipe) {
      console.error('Recipe insert error:', recipeError);
      return jsonError(
        'INTERNAL_ERROR',
        'Failed to create recipe',
        500
      );
    }

    let resolvedIngredients: ResolvedIngredient[] = [];
    let recipeIngredientsData: RecipeIngredientEntity[] = [];

    try {
      // Step 4: Upsert ingredients to master table
      resolvedIngredients = await upsertIngredients(
        locals.supabase,
        data.ingredients
      );

      // Step 5: Insert recipe_ingredients junction records (bulk insert)
      const recipeIngredientsInsert = resolvedIngredients.map((resolved) => ({
        recipe_id: recipe.id,
        ingredient_id: resolved.id,
        quantity: resolved.input.quantity ?? 0,
        quantity_display: resolved.input.quantity_display ?? null,
        unit: resolved.input.unit.trim(),
        order_index: resolved.input.order_index,
        notes: resolved.input.notes?.trim() || null,
      }));

      // @ts-ignore - Database types not yet generated from schema
      const {
        data: recipeIngredients,
        error: recipeIngredientsError,
      } = await locals.supabase
        .from('recipe_ingredients')
        .insert(recipeIngredientsInsert)
        .select('*') as { data: RecipeIngredientEntity[] | null; error: any };

      if (recipeIngredientsError || !recipeIngredients) {
        throw new Error(
          `Failed to insert recipe ingredients: ${recipeIngredientsError?.message}`
        );
      }

      recipeIngredientsData = recipeIngredients;
    } catch (ingredientError) {
      // Best-effort cleanup: delete the recipe if ingredient operations fail
      console.error('Ingredient operation error:', ingredientError);
      // @ts-ignore - Database types not yet generated from schema
      await locals.supabase
        .from('recipes')
        .delete()
        .eq('id', recipe.id);

      return jsonError(
        'INTERNAL_ERROR',
        'Failed to process ingredients',
        500
      );
    }

    // Step 6: Fetch author profile
    // @ts-ignore - Database types not yet generated from schema
    const { data: profile, error: profileError } = await locals.supabase
      .from('profiles')
      .select('username, display_name, avatar_url, created_at')
      .eq('id', user.id)
      .single() as { data: Partial<PublicProfileDTO> | null; error: any };

    if (profileError || !profile) {
      console.error('Profile fetch error:', profileError);
      // Best-effort cleanup
      // @ts-ignore - Database types not yet generated from schema
      await locals.supabase
        .from('recipes')
        .delete()
        .eq('id', recipe.id);

      return jsonError(
        'INTERNAL_ERROR',
        'Failed to fetch author profile',
        500
      );
    }

    // Count user's public recipes for profile
    // @ts-ignore - Database types not yet generated from schema
    const { count: publicRecipeCount } = await locals.supabase
      .from('recipes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_public', true);

    const author: PublicProfileDTO = {
      username: profile.username!,
      display_name: profile.display_name ?? null,
      avatar_url: profile.avatar_url ?? null,
      created_at: profile.created_at!,
      public_recipe_count: publicRecipeCount ?? 0,
    };

    // Step 7: Assemble RecipeDTO response
    // Fetch full ingredient details for all ingredient IDs
    const ingredientIds = resolvedIngredients.map((r) => r.id);
    
    // @ts-ignore - Database types not yet generated from schema
    const { data: fullIngredients, error: ingredientsError } = await locals.supabase
      .from('ingredients')
      .select('*')
      .in('id', ingredientIds) as { data: IngredientEntity[] | null; error: any };

    if (ingredientsError || !fullIngredients) {
      console.error('Failed to fetch ingredient details:', ingredientsError);
      // Use best-effort ingredient data from resolved ingredients
    }

    // Build RecipeIngredientWithDetails array by combining junction records with ingredient details
    const ingredientsWithDetails: RecipeIngredientWithDetails[] = recipeIngredientsData.map((ri) => {
      // Find the corresponding ingredient
      const ingredient = fullIngredients?.find((ing) => ing.id === ri.ingredient_id);
      const resolved = resolvedIngredients.find((r) => r.id === ri.ingredient_id);
      
      if (!ingredient || !resolved) {
        throw new Error(`Ingredient ${ri.ingredient_id} not found`);
      }

      return {
        id: ri.id,
        recipe_id: ri.recipe_id,
        quantity: ri.quantity,
        quantity_display: ri.quantity_display,
        unit: ri.unit,
        order_index: ri.order_index,
        notes: ri.notes,
        ingredient,
      };
    });

    const recipeDTO: RecipeDTO = {
      ...recipe,
      author,
      ingredients: ingredientsWithDetails,
    };

    // Return 201 Created with full recipe DTO
    return new Response(JSON.stringify(recipeDTO), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('POST /api/recipes unexpected error:', error);
    return jsonError(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      500
    );
  }
};
