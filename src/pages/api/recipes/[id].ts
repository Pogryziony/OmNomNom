/**
 * GET /api/recipes/:id - Get Recipe by ID
 * PUT /api/recipes/:id - Update Recipe
 * DELETE /api/recipes/:id - Delete Recipe
 * 
 * Handles individual recipe operations including retrieval, updates, and deletion.
 * 
 * @see .ai/api-plan.md - API specifications
 * @see src/types.ts - Type definitions
 */

import type { APIRoute } from 'astro';
import type {
  RecipeDTO,
  UpdateRecipeCommand,
  ApiErrorResponse,
  ApiErrorCode,
  RecipeEntity,
  IngredientEntity,
  RecipeIngredientEntity,
  PublicProfileDTO,
  RecipeIngredientWithDetails,
  RecipeIngredientInput,
  DeleteResponse,
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
 * Normalizes ingredient name to lowercase and trimmed
 */
function normalizeIngredientName(name: string): string {
  return name.toLowerCase().trim();
}

/**
 * Converts ingredient name to Title Case for display
 */
function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * GET /api/recipes/:id
 * 
 * Retrieves a single recipe with full details including author and ingredients.
 * - Private recipes: Only accessible by owner
 * - Public recipes: Accessible by all users (authenticated and anonymous)
 */
export const GET: APIRoute = async ({ params, request, locals }) => {
  try {
    const { id } = params;

    if (!id) {
      return jsonError(
        'VALIDATION_ERROR',
        'Recipe ID is required',
        400,
        'id'
      );
    }

    // Step 1: Fetch recipe
    // @ts-ignore - Database types not yet generated from schema
    const { data: recipe, error: recipeError } = await locals.supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
      .single() as { data: RecipeEntity | null; error: any };

    if (recipeError || !recipe) {
      return jsonError(
        'NOT_FOUND',
        'Recipe not found',
        404
      );
    }

    // Step 2: Check authorization for private recipes
    if (!recipe.is_public) {
      const authHeader = request.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return jsonError(
          'AUTHENTICATION_ERROR',
          'Authentication required for private recipes',
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

      if (recipe.user_id !== user.id) {
        return jsonError(
          'AUTHORIZATION_ERROR',
          'You do not have permission to access this recipe',
          403
        );
      }
    }

    // Step 3: Fetch author profile
    // @ts-ignore - Database types not yet generated from schema
    const { data: profile, error: profileError } = await locals.supabase
      .from('profiles')
      .select('username, display_name, avatar_url, created_at')
      .eq('id', recipe.user_id)
      .single() as { data: Partial<PublicProfileDTO> | null; error: any };

    if (profileError || !profile) {
      console.error('Profile fetch error:', profileError);
      return jsonError(
        'INTERNAL_ERROR',
        'Failed to fetch author profile',
        500
      );
    }

    // Count user's public recipes
    // @ts-ignore - Database types not yet generated from schema
    const { count: publicRecipeCount } = await locals.supabase
      .from('recipes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', recipe.user_id)
      .eq('is_public', true);

    const author: PublicProfileDTO = {
      username: profile.username!,
      display_name: profile.display_name ?? null,
      avatar_url: profile.avatar_url ?? null,
      created_at: profile.created_at!,
      public_recipe_count: publicRecipeCount ?? 0,
    };

    // Step 4: Fetch recipe ingredients with details
    // @ts-ignore - Database types not yet generated from schema
    const { data: recipeIngredients, error: ingredientsError } = await locals.supabase
      .from('recipe_ingredients')
      .select('*')
      .eq('recipe_id', id)
      .order('order_index', { ascending: true }) as { 
        data: RecipeIngredientEntity[] | null; 
        error: any 
      };

    if (ingredientsError) {
      console.error('Ingredients fetch error:', ingredientsError);
      return jsonError(
        'INTERNAL_ERROR',
        'Failed to fetch recipe ingredients',
        500
      );
    }

    // Step 5: Fetch full ingredient details
    const ingredientIds = (recipeIngredients || []).map((ri) => ri.ingredient_id);
    
    // @ts-ignore - Database types not yet generated from schema
    const { data: fullIngredients, error: fullIngredientsError } = await locals.supabase
      .from('ingredients')
      .select('*')
      .in('id', ingredientIds) as { data: IngredientEntity[] | null; error: any };

    if (fullIngredientsError) {
      console.error('Failed to fetch ingredient details:', fullIngredientsError);
    }

    // Step 6: Build RecipeIngredientWithDetails array
    const ingredientsWithDetails: RecipeIngredientWithDetails[] = (recipeIngredients || []).map((ri) => {
      const ingredient = fullIngredients?.find((ing) => ing.id === ri.ingredient_id);
      
      if (!ingredient) {
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

    // Step 7: Assemble RecipeDTO
    const recipeDTO: RecipeDTO = {
      ...recipe,
      author,
      ingredients: ingredientsWithDetails,
    };

    return new Response(JSON.stringify(recipeDTO), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('GET /api/recipes/:id unexpected error:', error);
    return jsonError(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      500
    );
  }
};

/**
 * PUT /api/recipes/:id
 * 
 * Updates an existing recipe (owner only).
 * If ingredients array is provided, all existing ingredients are replaced.
 */
export const PUT: APIRoute = async ({ params, request, locals }) => {
  try {
    const { id } = params;

    if (!id) {
      return jsonError(
        'VALIDATION_ERROR',
        'Recipe ID is required',
        400,
        'id'
      );
    }

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

    // Step 2: Verify recipe exists and ownership
    // @ts-ignore - Database types not yet generated from schema
    const { data: existingRecipe, error: fetchError } = await locals.supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
      .single() as { data: RecipeEntity | null; error: any };

    if (fetchError || !existingRecipe) {
      return jsonError(
        'NOT_FOUND',
        'Recipe not found',
        404
      );
    }

    if (existingRecipe.user_id !== user.id) {
      return jsonError(
        'AUTHORIZATION_ERROR',
        'You do not have permission to update this recipe',
        403
      );
    }

    // Step 3: Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError(
        'VALIDATION_ERROR',
        'Invalid JSON in request body',
        400
      );
    }

    const data = body as UpdateRecipeCommand;

    // Step 4: Validate fields (reuse validation logic from POST)
    if (data.title !== undefined) {
      const trimmedTitle = data.title.trim();
      if (trimmedTitle.length === 0 || trimmedTitle.length > 200) {
        return jsonError(
          'VALIDATION_ERROR',
          'Title must be between 1 and 200 characters',
          400,
          'title'
        );
      }
    }

    if (data.instructions !== undefined) {
      const trimmedInstructions = data.instructions.trim();
      if (trimmedInstructions.length === 0) {
        return jsonError(
          'VALIDATION_ERROR',
          'Instructions cannot be empty',
          400,
          'instructions'
        );
      }
    }

    if (data.servings !== undefined) {
      if (typeof data.servings !== 'number' || data.servings <= 0) {
        return jsonError(
          'VALIDATION_ERROR',
          'Servings must be a number greater than 0',
          400,
          'servings'
        );
      }
    }

    if (data.prep_time !== undefined && data.prep_time !== null) {
      if (typeof data.prep_time !== 'number' || data.prep_time < 0) {
        return jsonError(
          'VALIDATION_ERROR',
          'Prep time must be a non-negative number',
          400,
          'prep_time'
        );
      }
    }

    if (data.cook_time !== undefined && data.cook_time !== null) {
      if (typeof data.cook_time !== 'number' || data.cook_time < 0) {
        return jsonError(
          'VALIDATION_ERROR',
          'Cook time must be a non-negative number',
          400,
          'cook_time'
        );
      }
    }

    if (data.description !== undefined && data.description !== null) {
      if (data.description.length > 5000) {
        return jsonError(
          'VALIDATION_ERROR',
          'Description cannot exceed 5000 characters',
          400,
          'description'
        );
      }
    }

    // Step 5: Update recipe
    const recipeUpdate: any = {};
    if (data.title !== undefined) recipeUpdate.title = data.title.trim();
    if (data.description !== undefined) recipeUpdate.description = data.description?.trim() || null;
    if (data.instructions !== undefined) recipeUpdate.instructions = data.instructions.trim();
    if (data.servings !== undefined) recipeUpdate.servings = data.servings;
    if (data.prep_time !== undefined) recipeUpdate.prep_time = data.prep_time;
    if (data.cook_time !== undefined) recipeUpdate.cook_time = data.cook_time;
    if (data.image_url !== undefined) recipeUpdate.image_url = data.image_url?.trim() || null;
    recipeUpdate.updated_at = new Date().toISOString();

    // @ts-ignore - Database types not yet generated from schema
    const { data: updatedRecipe, error: updateError } = await locals.supabase
      .from('recipes')
      .update(recipeUpdate)
      .eq('id', id)
      .select('*')
      .single() as { data: RecipeEntity | null; error: any };

    if (updateError || !updatedRecipe) {
      console.error('Recipe update error:', updateError);
      return jsonError(
        'INTERNAL_ERROR',
        'Failed to update recipe',
        500
      );
    }

    // Step 6: Handle ingredients update if provided
    let ingredientsWithDetails: RecipeIngredientWithDetails[] = [];

    if (data.ingredients && Array.isArray(data.ingredients)) {
      // Validate ingredients array
      if (data.ingredients.length === 0) {
        return jsonError(
          'VALIDATION_ERROR',
          'Ingredients array cannot be empty',
          400,
          'ingredients'
        );
      }

      // Delete existing recipe_ingredients
      // @ts-ignore - Database types not yet generated from schema
      const { error: deleteError } = await locals.supabase
        .from('recipe_ingredients')
        .delete()
        .eq('recipe_id', id);

      if (deleteError) {
        console.error('Error deleting old ingredients:', deleteError);
        return jsonError(
          'INTERNAL_ERROR',
          'Failed to update recipe ingredients',
          500
        );
      }

      // Upsert new ingredients (reuse logic from POST)
      const resolvedIngredients: Array<{ id: string; input: RecipeIngredientInput }> = [];

      for (const input of data.ingredients) {
        const normalizedName = normalizeIngredientName(input.ingredient_name);
        const displayName = toTitleCase(input.ingredient_name);

        // @ts-ignore - Database types not yet generated from schema
        const { data: ingredient, error: ingredientError } = await locals.supabase
          .from('ingredients')
          .upsert(
            {
              name: normalizedName,
              display_name: displayName,
              category: null,
            },
            {
              onConflict: 'name',
              ignoreDuplicates: false,
            }
          )
          .select('*')
          .single() as { data: IngredientEntity | null; error: any };

        if (ingredientError || !ingredient) {
          console.error(`Failed to upsert ingredient "${input.ingredient_name}":`, ingredientError);
          return jsonError(
            'INTERNAL_ERROR',
            'Failed to process ingredients',
            500
          );
        }

        resolvedIngredients.push({
          id: ingredient.id,
          input,
        });
      }

      // Bulk insert new recipe_ingredients
      const recipeIngredientsInsert = resolvedIngredients.map((resolved) => ({
        recipe_id: updatedRecipe.id,
        ingredient_id: resolved.id,
        quantity: resolved.input.quantity ?? 0,
        quantity_display: resolved.input.quantity_display ?? null,
        unit: resolved.input.unit.trim(),
        order_index: resolved.input.order_index,
        notes: resolved.input.notes?.trim() || null,
      }));

      // @ts-ignore - Database types not yet generated from schema
      const { data: newRecipeIngredients, error: insertError } = await locals.supabase
        .from('recipe_ingredients')
        .insert(recipeIngredientsInsert)
        .select('*') as { data: RecipeIngredientEntity[] | null; error: any };

      if (insertError || !newRecipeIngredients) {
        console.error('Error inserting new ingredients:', insertError);
        return jsonError(
          'INTERNAL_ERROR',
          'Failed to update recipe ingredients',
          500
        );
      }

      // Fetch full ingredient details
      const ingredientIds = resolvedIngredients.map((r) => r.id);
      
      // @ts-ignore - Database types not yet generated from schema
      const { data: fullIngredients } = await locals.supabase
        .from('ingredients')
        .select('*')
        .in('id', ingredientIds) as { data: IngredientEntity[] | null; error: any };

      ingredientsWithDetails = newRecipeIngredients.map((ri) => {
        const ingredient = fullIngredients?.find((ing) => ing.id === ri.ingredient_id);
        
        if (!ingredient) {
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
    } else {
      // Fetch existing ingredients if not updating
      // @ts-ignore - Database types not yet generated from schema
      const { data: existingIngredients } = await locals.supabase
        .from('recipe_ingredients')
        .select('*')
        .eq('recipe_id', id)
        .order('order_index', { ascending: true }) as { 
          data: RecipeIngredientEntity[] | null; 
          error: any 
        };

      if (existingIngredients && existingIngredients.length > 0) {
        const ingredientIds = existingIngredients.map((ri) => ri.ingredient_id);
        
        // @ts-ignore - Database types not yet generated from schema
        const { data: fullIngredients } = await locals.supabase
          .from('ingredients')
          .select('*')
          .in('id', ingredientIds) as { data: IngredientEntity[] | null; error: any };

        ingredientsWithDetails = existingIngredients.map((ri) => {
          const ingredient = fullIngredients?.find((ing) => ing.id === ri.ingredient_id);
          
          if (!ingredient) {
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
      }
    }

    // Step 7: Fetch author profile
    // @ts-ignore - Database types not yet generated from schema
    const { data: profile } = await locals.supabase
      .from('profiles')
      .select('username, display_name, avatar_url, created_at')
      .eq('id', user.id)
      .single() as { data: Partial<PublicProfileDTO> | null; error: any };

    // @ts-ignore - Database types not yet generated from schema
    const { count: publicRecipeCount } = await locals.supabase
      .from('recipes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_public', true);

    const author: PublicProfileDTO = {
      username: profile?.username || '',
      display_name: profile?.display_name ?? null,
      avatar_url: profile?.avatar_url ?? null,
      created_at: profile?.created_at || new Date().toISOString(),
      public_recipe_count: publicRecipeCount ?? 0,
    };

    // Step 8: Assemble response
    const recipeDTO: RecipeDTO = {
      ...updatedRecipe,
      author,
      ingredients: ingredientsWithDetails,
    };

    return new Response(JSON.stringify(recipeDTO), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('PUT /api/recipes/:id unexpected error:', error);
    return jsonError(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      500
    );
  }
};

/**
 * DELETE /api/recipes/:id
 * 
 * Deletes a recipe (owner only).
 * Cascade deletes all recipe_ingredients entries.
 */
export const DELETE: APIRoute = async ({ params, request, locals }) => {
  try {
    const { id } = params;

    if (!id) {
      return jsonError(
        'VALIDATION_ERROR',
        'Recipe ID is required',
        400,
        'id'
      );
    }

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

    // Step 2: Verify recipe exists and ownership
    // @ts-ignore - Database types not yet generated from schema
    const { data: existingRecipe, error: fetchError } = await locals.supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
      .single() as { data: RecipeEntity | null; error: any };

    if (fetchError || !existingRecipe) {
      return jsonError(
        'NOT_FOUND',
        'Recipe not found',
        404
      );
    }

    if (existingRecipe.user_id !== user.id) {
      return jsonError(
        'AUTHORIZATION_ERROR',
        'You do not have permission to delete this recipe',
        403
      );
    }

    // Step 3: Delete recipe (cascade will handle recipe_ingredients)
    // @ts-ignore - Database types not yet generated from schema
    const { error: deleteError } = await locals.supabase
      .from('recipes')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Recipe deletion error:', deleteError);
      return jsonError(
        'INTERNAL_ERROR',
        'Failed to delete recipe',
        500
      );
    }

    // Step 4: Return success response
    const response: DeleteResponse = {
      message: 'Recipe deleted successfully',
      id,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('DELETE /api/recipes/:id unexpected error:', error);
    return jsonError(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      500
    );
  }
};
