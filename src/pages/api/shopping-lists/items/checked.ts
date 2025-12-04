/**
 * DELETE /api/shopping-lists/items/checked - Clear Checked Items
 * 
 * Deletes all checked items from the user's shopping list.
 * 
 * @see .ai/api-plan.md - API specifications
 * @see src/types.ts - Type definitions
 */

import type { APIRoute } from 'astro';
import type {
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
 * DELETE /api/shopping-lists/items/checked
 * 
 * Bulk deletes all checked items from the user's shopping list.
 */
export const DELETE: APIRoute = async ({ request, locals }) => {
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

    // Step 2: Get user's shopping list
    // @ts-ignore - Database types not yet generated from schema
    const { data: shoppingList, error: listError } = await locals.supabase
      .from('shopping_lists')
      .select('id')
      .eq('user_id', user.id)
      .single() as {
        data: { id: string } | null;
        error: any;
      };

    if (listError || !shoppingList) {
      // If no shopping list exists, return success with 0 deleted
      const response = {
        deleted_count: 0,
        message: 'No shopping list found',
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    // Step 3: Count checked items before deletion
    // @ts-ignore - Database types not yet generated from schema
    const { count: checkedCount, error: countError } = await locals.supabase
      .from('shopping_list_items')
      .select('*', { count: 'exact', head: true })
      .eq('shopping_list_id', shoppingList.id)
      .eq('is_checked', true) as { count: number | null; error: any };

    if (countError) {
      console.error('Error counting checked items:', countError);
      return jsonError(
        'INTERNAL_ERROR',
        'Failed to count checked items',
        500
      );
    }

    const itemsToDelete = checkedCount || 0;

    // If no checked items, return early
    if (itemsToDelete === 0) {
      const response = {
        deleted_count: 0,
        message: 'No checked items to delete',
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    // Step 4: Delete all checked items
    // @ts-ignore - Database types not yet generated from schema
    const { error: deleteError } = await locals.supabase
      .from('shopping_list_items')
      .delete()
      .eq('shopping_list_id', shoppingList.id)
      .eq('is_checked', true);

    if (deleteError) {
      console.error('Error deleting checked items:', deleteError);
      return jsonError(
        'INTERNAL_ERROR',
        'Failed to delete checked items',
        500
      );
    }

    // Step 5: Update shopping list timestamp
    // @ts-ignore - Database types not yet generated from schema
    await locals.supabase
      .from('shopping_lists')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', shoppingList.id);

    // Step 6: Return success response
    const response = {
      deleted_count: itemsToDelete,
      message: `Successfully deleted ${itemsToDelete} checked item${itemsToDelete !== 1 ? 's' : ''}`,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('DELETE /api/shopping-lists/items/checked unexpected error:', error);
    return jsonError(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      500
    );
  }
};
