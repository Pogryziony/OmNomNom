/**
 * POST /api/recipes/:id/scale - Scale Recipe
 * 
 * Scales a recipe to a different number of servings.
 * Recalculates all ingredient quantities proportionally.
 * 
 * @see .ai/api-plan.md - API specifications
 * @see src/types.ts - Type definitions
 */

import type { APIRoute } from 'astro';
import type {
  ScaleRecipeCommand,
  ScaledRecipeDTO,
  ScaledIngredientDTO,
  ApiErrorResponse,
  ApiErrorCode,
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
 * POST /api/recipes/:id/scale
 * 
 * Scales a recipe to a new number of servings.
 * Public recipes can be scaled by anyone, private recipes require ownership.
 */
export const POST: APIRoute = async ({ params, request, locals }) => {
  try {
    // Step 1: Validate recipe ID parameter
    const { id } = params;
    if (!id || id.trim().length === 0) {
      return jsonError(
        'VALIDATION_ERROR',
        'Recipe ID parameter is required',
        400,
        'id'
      );
    }

    // Step 2: Parse and validate request body
    let body: ScaleRecipeCommand;
    try {
      body = await request.json();
    } catch {
      return jsonError(
        'VALIDATION_ERROR',
        'Invalid JSON in request body',
        400
      );
    }

    if (!body.desired_servings || typeof body.desired_servings !== 'number') {
      return jsonError(
        'VALIDATION_ERROR',
        'desired_servings is required and must be a number',
        400,
        'desired_servings'
      );
    }

    if (body.desired_servings <= 0) {
      return jsonError(
        'VALIDATION_ERROR',
        'desired_servings must be greater than 0',
        400,
        'desired_servings'
      );
    }

    if (body.desired_servings > 1000) {
      return jsonError(
        'VALIDATION_ERROR',
        'desired_servings must not exceed 1000',
        400,
        'desired_servings'
      );
    }

    // Step 3: Attempt authentication (optional for public recipes)
    let authenticatedUserId: string | null = null;
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user } } = await locals.supabase.auth.getUser(token);
      if (user) {
        authenticatedUserId = user.id;
      }
    }

    // Step 4: Fetch recipe
    // @ts-ignore - Database types not yet generated from schema
    const { data: recipe, error: recipeError } = await locals.supabase
      .from('recipes')
      .select('id, title, servings, is_public, user_id')
      .eq('id', id)
      .single() as {
        data: {
          id: string;
          title: string;
          servings: number;
          is_public: boolean;
          user_id: string;
        } | null;
        error: any;
      };

    if (recipeError || !recipe) {
      return jsonError(
        'NOT_FOUND',
        'Recipe not found',
        404
      );
    }

    // Step 5: Authorization check
    // Private recipes can only be scaled by the owner
    if (!recipe.is_public && recipe.user_id !== authenticatedUserId) {
      return jsonError(
        'AUTHORIZATION_ERROR',
        'You do not have permission to scale this recipe',
        403
      );
    }

    // Step 6: Fetch recipe ingredients
    // @ts-ignore - Database types not yet generated from schema
    const { data: recipeIngredients, error: ingredientsError } = await locals.supabase
      .from('recipe_ingredients')
      .select(`
        id,
        quantity,
        quantity_display,
        unit,
        order_index,
        ingredient_id,
        ingredients (
          id,
          name
        )
      `)
      .eq('recipe_id', id)
      .order('order_index', { ascending: true }) as {
        data: Array<{
          id: string;
          quantity: number;
          quantity_display: string | null;
          unit: string;
          order_index: number;
          ingredient_id: string;
          ingredients: {
            id: string;
            name: string;
          };
        }> | null;
        error: any;
      };

    if (ingredientsError) {
      console.error('Error fetching recipe ingredients:', ingredientsError);
      return jsonError(
        'INTERNAL_ERROR',
        'Failed to fetch recipe ingredients',
        500
      );
    }

    // Step 7: Calculate scaling factor
    const scalingFactor = body.desired_servings / recipe.servings;

    // Step 8: Scale ingredients
    const scaledIngredients: ScaledIngredientDTO[] = (recipeIngredients || []).map(ri => {
      // Scale the quantity
      const scaledQuantity = ri.quantity * scalingFactor;
      
      // Round to 2 decimal places for cleaner display
      const roundedQuantity = Math.round(scaledQuantity * 100) / 100;

      // Format quantity display
      let quantityDisplay: string;
      if (ri.quantity_display) {
        // If there's a custom display (like "to taste"), preserve it with a note
        quantityDisplay = ri.quantity_display;
      } else {
        // Format the number nicely
        quantityDisplay = roundedQuantity.toString();
      }

      // Determine if this ingredient should have a scaling note
      let notes: string | null = null;
      if (ri.quantity_display && (ri.quantity_display.includes('taste') || ri.quantity_display.includes('pinch'))) {
        notes = '*Not scaled - adjust to taste';
      }

      return {
        ingredient: {
          name: ri.ingredients.name,
          display_name: ri.ingredients.name, // Could be enhanced with proper display name
        },
        original_quantity: ri.quantity,
        scaled_quantity: roundedQuantity,
        quantity_display: quantityDisplay,
        unit: ri.unit,
        notes,
      };
    });

    // Step 9: Build ScaledRecipeDTO response
    const scaledRecipe: ScaledRecipeDTO = {
      original_servings: recipe.servings,
      desired_servings: body.desired_servings,
      scaling_factor: Math.round(scalingFactor * 100) / 100, // Round to 2 decimals
      scaled_ingredients: scaledIngredients,
    };

    return new Response(JSON.stringify(scaledRecipe), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('POST /api/recipes/:id/scale unexpected error:', error);
    return jsonError(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      500
    );
  }
};
