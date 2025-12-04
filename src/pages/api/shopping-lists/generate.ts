/**
 * POST /api/shopping-lists/generate - Generate Shopping List from Recipes
 * 
 * Generates a shopping list from one or more recipes.
 * Combines ingredients intelligently, grouping by ingredient name and unit.
 * 
 * @see .ai/api-plan.md - API specifications
 * @see src/types.ts - Type definitions
 */

import type { APIRoute } from 'astro';
import type {
  GenerateShoppingListCommand,
  GenerateShoppingListResponse,
  ShoppingListItemDTO,
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
 * Helper to normalize ingredient name for grouping
 */
function normalizeIngredientName(name: string): string {
  return name.toLowerCase().trim();
}

/**
 * POST /api/shopping-lists/generate
 * 
 * Generates shopping list items from recipes.
 * Combines ingredients with the same name and unit.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Step 1: Authenticate user
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return jsonError(
        'AUTHENTICATION_ERROR',
        'Missing or invalid authorization header',
        401
      );
    }

    const token = authHeader.substring(7);
    const {
      data: { user },
      error: authError,
    } = await locals.supabase.auth.getUser(token);

    if (authError || !user) {
      return jsonError(
        'AUTHENTICATION_ERROR',
        'Invalid authentication token',
        401
      );
    }

    // Step 2: Parse and validate request body
    let body: GenerateShoppingListCommand;
    try {
      body = await request.json();
    } catch {
      return jsonError(
        'VALIDATION_ERROR',
        'Invalid JSON in request body',
        400
      );
    }

    if (!Array.isArray(body.recipe_ids) || body.recipe_ids.length === 0) {
      return jsonError(
        'VALIDATION_ERROR',
        'recipe_ids must be a non-empty array',
        400,
        'recipe_ids'
      );
    }

    if (body.recipe_ids.length > 50) {
      return jsonError(
        'VALIDATION_ERROR',
        'Cannot generate shopping list from more than 50 recipes at once',
        400,
        'recipe_ids'
      );
    }

    if (typeof body.replace_existing !== 'boolean') {
      return jsonError(
        'VALIDATION_ERROR',
        'replace_existing must be a boolean',
        400,
        'replace_existing'
      );
    }

    // Step 3: Verify user owns all recipes
    // @ts-ignore - Database types not yet generated from schema
    const { data: recipes, error: recipesError } = await locals.supabase
      .from('recipes')
      .select('id, user_id')
      .in('id', body.recipe_ids) as {
        data: Array<{ id: string; user_id: string }> | null;
        error: any;
      };

    if (recipesError) {
      console.error('Error fetching recipes:', recipesError);
      return jsonError(
        'INTERNAL_ERROR',
        'Failed to fetch recipes',
        500
      );
    }

    if (!recipes || recipes.length !== body.recipe_ids.length) {
      return jsonError(
        'NOT_FOUND',
        'One or more recipes not found',
        404
      );
    }

    // Check ownership
    const unauthorizedRecipes = recipes.filter(r => r.user_id !== user.id);
    if (unauthorizedRecipes.length > 0) {
      return jsonError(
        'AUTHORIZATION_ERROR',
        'You can only generate shopping lists from your own recipes',
        403
      );
    }

    // Step 4: Get or create shopping list
    // @ts-ignore - Database types not yet generated from schema
    let { data: shoppingList, error: listError } = await locals.supabase
      .from('shopping_lists')
      .select('id')
      .eq('user_id', user.id)
      .single() as {
        data: { id: string } | null;
        error: any;
      };

    if (listError && listError.code === 'PGRST116') {
      // Create shopping list if it doesn't exist
      // @ts-ignore - Database types not yet generated from schema
      const { data: newList, error: createError } = await locals.supabase
        .from('shopping_lists')
        .insert({
          user_id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single() as {
          data: { id: string } | null;
          error: any;
        };

      if (createError || !newList) {
        console.error('Error creating shopping list:', createError);
        return jsonError(
          'INTERNAL_ERROR',
          'Failed to create shopping list',
          500
        );
      }

      shoppingList = newList;
    } else if (listError || !shoppingList) {
      console.error('Error fetching shopping list:', listError);
      return jsonError(
        'INTERNAL_ERROR',
        'Failed to fetch shopping list',
        500
      );
    }

    // Step 5: If replace_existing, clear all items
    let itemsUpdated = 0;
    if (body.replace_existing) {
      // @ts-ignore - Database types not yet generated from schema
      const { error: deleteError } = await locals.supabase
        .from('shopping_list_items')
        .delete()
        .eq('shopping_list_id', shoppingList.id);

      if (deleteError) {
        console.error('Error clearing shopping list:', deleteError);
        return jsonError(
          'INTERNAL_ERROR',
          'Failed to clear shopping list',
          500
        );
      }
    }

    // Step 6: Fetch all ingredients from all recipes
    // @ts-ignore - Database types not yet generated from schema
    const { data: recipeIngredients, error: ingredientsError } = await locals.supabase
      .from('recipe_ingredients')
      .select(`
        recipe_id,
        quantity,
        unit,
        ingredients (
          id,
          name
        )
      `)
      .in('recipe_id', body.recipe_ids) as {
        data: Array<{
          recipe_id: string;
          quantity: number;
          unit: string;
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

    // Step 7: Group and combine ingredients by name and unit
    const combinedIngredients = new Map<string, {
      name: string;
      quantity: number;
      unit: string;
      recipe_ids: Set<string>;
    }>();

    (recipeIngredients || []).forEach(ri => {
      const normalizedName = normalizeIngredientName(ri.ingredients.name);
      const key = `${normalizedName}::${ri.unit.toLowerCase()}`;

      if (combinedIngredients.has(key)) {
        const existing = combinedIngredients.get(key)!;
        existing.quantity += ri.quantity;
        existing.recipe_ids.add(ri.recipe_id);
      } else {
        combinedIngredients.set(key, {
          name: ri.ingredients.name,
          quantity: ri.quantity,
          unit: ri.unit,
          recipe_ids: new Set([ri.recipe_id]),
        });
      }
    });

    // Step 8: Insert combined ingredients as shopping list items
    const itemsToInsert = Array.from(combinedIngredients.values()).map(item => ({
      shopping_list_id: shoppingList.id,
      source_recipe_id: null, // Could be enhanced to store multiple recipe IDs
      name: item.name,
      quantity: Math.round(item.quantity * 100) / 100, // Round to 2 decimals
      unit: item.unit,
      category: null, // Could be enhanced with ingredient categories
      is_checked: false,
      created_at: new Date().toISOString(),
    }));

    let addedItems: ShoppingListItemDTO[] = [];
    if (itemsToInsert.length > 0) {
      // @ts-ignore - Database types not yet generated from schema
      const { data: insertedItems, error: insertError } = await locals.supabase
        .from('shopping_list_items')
        .insert(itemsToInsert)
        .select('*') as {
          data: Array<{
            id: string;
            shopping_list_id: string;
            source_recipe_id: string | null;
            name: string;
            quantity: number;
            unit: string;
            category: string | null;
            is_checked: boolean;
            created_at: string;
          }> | null;
          error: any;
        };

      if (insertError) {
        console.error('Error inserting shopping list items:', insertError);
        return jsonError(
          'INTERNAL_ERROR',
          'Failed to add items to shopping list',
          500
        );
      }

      addedItems = insertedItems || [];
    }

    // Step 9: Update shopping list timestamp
    // @ts-ignore - Database types not yet generated from schema
    await locals.supabase
      .from('shopping_lists')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', shoppingList.id);

    // Step 10: Build response
    const response: GenerateShoppingListResponse = {
      id: shoppingList.id,
      items_added: addedItems.length,
      items_updated: itemsUpdated,
      items: addedItems,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('POST /api/shopping-lists/generate unexpected error:', error);
    return jsonError(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      500
    );
  }
};
