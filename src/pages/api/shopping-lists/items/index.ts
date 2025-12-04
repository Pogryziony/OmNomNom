/**
 * POST /api/shopping-lists/items - Add Manual Item to Shopping List
 * 
 * Adds a manually entered item to the user's shopping list.
 * 
 * @see .ai/api-plan.md - API specifications
 * @see src/types.ts - Type definitions
 */

import type { APIRoute } from 'astro';
import type {
  AddShoppingListItemCommand,
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
 * POST /api/shopping-lists/items
 * 
 * Adds a manual item to the user's shopping list.
 * Creates shopping list if it doesn't exist.
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
    let body: AddShoppingListItemCommand;
    try {
      body = await request.json();
    } catch {
      return jsonError(
        'VALIDATION_ERROR',
        'Invalid JSON in request body',
        400
      );
    }

    // Validate name
    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      return jsonError(
        'VALIDATION_ERROR',
        'name is required and cannot be empty',
        400,
        'name'
      );
    }

    if (body.name.length > 200) {
      return jsonError(
        'VALIDATION_ERROR',
        'name must not exceed 200 characters',
        400,
        'name'
      );
    }

    // Validate quantity
    if (typeof body.quantity !== 'number' || body.quantity <= 0) {
      return jsonError(
        'VALIDATION_ERROR',
        'quantity must be a number greater than 0',
        400,
        'quantity'
      );
    }

    if (body.quantity > 999999) {
      return jsonError(
        'VALIDATION_ERROR',
        'quantity must not exceed 999999',
        400,
        'quantity'
      );
    }

    // Validate unit
    if (!body.unit || typeof body.unit !== 'string' || body.unit.trim().length === 0) {
      return jsonError(
        'VALIDATION_ERROR',
        'unit is required and cannot be empty',
        400,
        'unit'
      );
    }

    if (body.unit.length > 50) {
      return jsonError(
        'VALIDATION_ERROR',
        'unit must not exceed 50 characters',
        400,
        'unit'
      );
    }

    // Validate category (optional)
    if (body.category !== undefined && body.category !== null) {
      if (typeof body.category !== 'string') {
        return jsonError(
          'VALIDATION_ERROR',
          'category must be a string or null',
          400,
          'category'
        );
      }

      if (body.category.length > 100) {
        return jsonError(
          'VALIDATION_ERROR',
          'category must not exceed 100 characters',
          400,
          'category'
        );
      }
    }

    // Step 3: Get or create shopping list
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

    // Step 4: Insert the item
    const newItem = {
      shopping_list_id: shoppingList.id,
      source_recipe_id: null, // Manual items have no source recipe
      name: body.name.trim(),
      quantity: Math.round(body.quantity * 100) / 100, // Round to 2 decimals
      unit: body.unit.trim(),
      category: body.category ? body.category.trim() : null,
      is_checked: false,
      created_at: new Date().toISOString(),
    };

    // @ts-ignore - Database types not yet generated from schema
    const { data: insertedItem, error: insertError } = await locals.supabase
      .from('shopping_list_items')
      .insert(newItem)
      .select('*')
      .single() as {
        data: {
          id: string;
          shopping_list_id: string;
          source_recipe_id: string | null;
          name: string;
          quantity: number;
          unit: string;
          category: string | null;
          is_checked: boolean;
          created_at: string;
        } | null;
        error: any;
      };

    if (insertError || !insertedItem) {
      console.error('Error inserting shopping list item:', insertError);
      return jsonError(
        'INTERNAL_ERROR',
        'Failed to add item to shopping list',
        500
      );
    }

    // Step 5: Update shopping list timestamp
    // @ts-ignore - Database types not yet generated from schema
    await locals.supabase
      .from('shopping_lists')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', shoppingList.id);

    // Step 6: Return the created item
    const response: ShoppingListItemDTO = insertedItem;

    return new Response(JSON.stringify(response), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('POST /api/shopping-lists/items unexpected error:', error);
    return jsonError(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      500
    );
  }
};
