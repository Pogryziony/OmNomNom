/**
 * GET /api/shopping-lists - Get Shopping List
 * 
 * Retrieves the authenticated user's shopping list with all items.
 * Each user has exactly one shopping list.
 * 
 * @see .ai/api-plan.md - API specifications
 * @see src/types.ts - Type definitions
 */

import type { APIRoute } from 'astro';
import type {
  ShoppingListDTO,
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
 * GET /api/shopping-lists
 * 
 * Retrieves the user's shopping list with all items.
 * Creates a new shopping list if one doesn't exist.
 */
export const GET: APIRoute = async ({ request, locals }) => {
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

    // Step 2: Fetch or create shopping list
    // @ts-ignore - Database types not yet generated from schema
    const { data: shoppingListData, error: listError } = await locals.supabase
      .from('shopping_lists')
      .select('*')
      .eq('user_id', user.id)
      .single() as {
        data: {
          id: string;
          user_id: string;
          created_at: string;
          updated_at: string;
        } | null;
        error: any;
      };

    let shoppingList = shoppingListData;

    // If no shopping list exists, create one
    if (listError && listError.code === 'PGRST116') {
      // @ts-ignore - Database types not yet generated from schema
      const { data: newList, error: createError } = await locals.supabase
        .from('shopping_lists')
        .insert({
          user_id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('*')
        .single() as {
          data: {
            id: string;
            user_id: string;
            created_at: string;
            updated_at: string;
          } | null;
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

    // Step 3: Fetch all items for this shopping list
    // @ts-ignore - Database types not yet generated from schema
    const { data: items, error: itemsError } = await locals.supabase
      .from('shopping_list_items')
      .select('*')
      .eq('shopping_list_id', shoppingList.id)
      .order('created_at', { ascending: true }) as {
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

    if (itemsError) {
      console.error('Error fetching shopping list items:', itemsError);
      return jsonError(
        'INTERNAL_ERROR',
        'Failed to fetch shopping list items',
        500
      );
    }

    // Step 4: Group items by category
    const itemsList: ShoppingListItemDTO[] = items || [];
    const groupedByCategory: Record<string, ShoppingListItemDTO[]> = {};

    itemsList.forEach(item => {
      const category = item.category || 'Uncategorized';
      if (!groupedByCategory[category]) {
        groupedByCategory[category] = [];
      }
      groupedByCategory[category].push(item);
    });

    // Step 5: Build ShoppingListDTO response
    const response: ShoppingListDTO = {
      id: shoppingList.id,
      user_id: shoppingList.user_id,
      created_at: shoppingList.created_at,
      updated_at: shoppingList.updated_at,
      items: itemsList,
      grouped_by_category: groupedByCategory,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('GET /api/shopping-lists unexpected error:', error);
    return jsonError(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      500
    );
  }
};
