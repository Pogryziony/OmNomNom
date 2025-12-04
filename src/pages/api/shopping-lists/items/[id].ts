/**
 * PATCH /api/shopping-lists/items/:id - Update Shopping List Item
 * DELETE /api/shopping-lists/items/:id - Delete Shopping List Item
 * 
 * Manages individual shopping list items.
 * 
 * @see .ai/api-plan.md - API specifications
 * @see src/types.ts - Type definitions
 */

import type { APIRoute } from 'astro';
import type {
  UpdateShoppingListItemCommand,
  ShoppingListItemDTO,
  DeleteResponse,
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
 * PATCH /api/shopping-lists/items/:id
 * 
 * Updates a shopping list item's quantity or checked status.
 * Only the item owner (via shopping list) can update.
 */
export const PATCH: APIRoute = async ({ params, request, locals }) => {
  try {
    // Step 1: Validate item ID parameter
    const { id } = params;
    if (!id || id.trim().length === 0) {
      return jsonError(
        'VALIDATION_ERROR',
        'Item ID parameter is required',
        400,
        'id'
      );
    }

    // Step 2: Authenticate user
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

    // Step 3: Parse and validate request body
    let body: UpdateShoppingListItemCommand;
    try {
      body = await request.json();
    } catch {
      return jsonError(
        'VALIDATION_ERROR',
        'Invalid JSON in request body',
        400
      );
    }

    // Validate at least one field is provided
    if (body.quantity === undefined && body.is_checked === undefined) {
      return jsonError(
        'VALIDATION_ERROR',
        'At least one field (quantity or is_checked) must be provided',
        400
      );
    }

    // Validate quantity if provided
    if (body.quantity !== undefined) {
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
    }

    // Validate is_checked if provided
    if (body.is_checked !== undefined && typeof body.is_checked !== 'boolean') {
      return jsonError(
        'VALIDATION_ERROR',
        'is_checked must be a boolean',
        400,
        'is_checked'
      );
    }

    // Step 4: Fetch item and verify ownership
    // @ts-ignore - Database types not yet generated from schema
    const { data: item, error: itemError } = await locals.supabase
      .from('shopping_list_items')
      .select(`
        *,
        shopping_lists!inner (
          user_id
        )
      `)
      .eq('id', id)
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
          shopping_lists: {
            user_id: string;
          };
        } | null;
        error: any;
      };

    if (itemError || !item) {
      return jsonError(
        'NOT_FOUND',
        'Shopping list item not found',
        404
      );
    }

    // Verify ownership
    if (item.shopping_lists.user_id !== user.id) {
      return jsonError(
        'AUTHORIZATION_ERROR',
        'You do not have permission to update this item',
        403
      );
    }

    // Step 5: Build update object
    const updates: Partial<{
      quantity: number;
      is_checked: boolean;
    }> = {};

    if (body.quantity !== undefined) {
      updates.quantity = Math.round(body.quantity * 100) / 100; // Round to 2 decimals
    }

    if (body.is_checked !== undefined) {
      updates.is_checked = body.is_checked;
    }

    // Step 6: Update the item
    // @ts-ignore - Database types not yet generated from schema
    const { data: updatedItem, error: updateError } = await locals.supabase
      .from('shopping_list_items')
      .update(updates)
      .eq('id', id)
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

    if (updateError || !updatedItem) {
      console.error('Error updating shopping list item:', updateError);
      return jsonError(
        'INTERNAL_ERROR',
        'Failed to update shopping list item',
        500
      );
    }

    // Step 7: Update shopping list timestamp
    // @ts-ignore - Database types not yet generated from schema
    await locals.supabase
      .from('shopping_lists')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', item.shopping_list_id);

    // Step 8: Return updated item
    const response: ShoppingListItemDTO = updatedItem;

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('PATCH /api/shopping-lists/items/:id unexpected error:', error);
    return jsonError(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      500
    );
  }
};

/**
 * DELETE /api/shopping-lists/items/:id
 * 
 * Deletes a shopping list item.
 * Only the item owner (via shopping list) can delete.
 */
export const DELETE: APIRoute = async ({ params, request, locals }) => {
  try {
    // Step 1: Validate item ID parameter
    const { id } = params;
    if (!id || id.trim().length === 0) {
      return jsonError(
        'VALIDATION_ERROR',
        'Item ID parameter is required',
        400,
        'id'
      );
    }

    // Step 2: Authenticate user
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

    // Step 3: Fetch item and verify ownership
    // @ts-ignore - Database types not yet generated from schema
    const { data: item, error: itemError } = await locals.supabase
      .from('shopping_list_items')
      .select(`
        shopping_list_id,
        shopping_lists!inner (
          user_id
        )
      `)
      .eq('id', id)
      .single() as {
        data: {
          shopping_list_id: string;
          shopping_lists: {
            user_id: string;
          };
        } | null;
        error: any;
      };

    if (itemError || !item) {
      return jsonError(
        'NOT_FOUND',
        'Shopping list item not found',
        404
      );
    }

    // Verify ownership
    if (item.shopping_lists.user_id !== user.id) {
      return jsonError(
        'AUTHORIZATION_ERROR',
        'You do not have permission to delete this item',
        403
      );
    }

    // Step 4: Delete the item
    // @ts-ignore - Database types not yet generated from schema
    const { error: deleteError } = await locals.supabase
      .from('shopping_list_items')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting shopping list item:', deleteError);
      return jsonError(
        'INTERNAL_ERROR',
        'Failed to delete shopping list item',
        500
      );
    }

    // Step 5: Update shopping list timestamp
    // @ts-ignore - Database types not yet generated from schema
    await locals.supabase
      .from('shopping_lists')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', item.shopping_list_id);

    // Step 6: Return success response
    const response: DeleteResponse = {
      message: 'Shopping list item deleted successfully',
      id: id,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('DELETE /api/shopping-lists/items/:id unexpected error:', error);
    return jsonError(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      500
    );
  }
};
