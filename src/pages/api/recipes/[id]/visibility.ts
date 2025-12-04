/**
 * PATCH /api/recipes/:id/visibility - Toggle Recipe Visibility
 * 
 * Toggles recipe between private and public status.
 * Updates published_at or unpublished_at timestamps accordingly.
 * 
 * @see .ai/api-plan.md - API specifications
 * @see src/types.ts - Type definitions
 */

import type { APIRoute } from 'astro';
import type {
  ToggleVisibilityCommand,
  RecipeVisibilityDTO,
  ApiErrorResponse,
  ApiErrorCode,
  RecipeEntity,
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
 * PATCH /api/recipes/:id/visibility
 * 
 * Toggles recipe visibility between private and public.
 * - If changing to public: sets published_at = NOW()
 * - If changing to private: sets unpublished_at = NOW()
 */
export const PATCH: APIRoute = async ({ params, request, locals }) => {
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

    // Step 2: Parse request body
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

    const data = body as ToggleVisibilityCommand;

    // Step 3: Validate is_public field
    if (typeof data.is_public !== 'boolean') {
      return jsonError(
        'VALIDATION_ERROR',
        'is_public must be a boolean value',
        400,
        'is_public'
      );
    }

    // Step 4: Verify recipe exists and ownership
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
        'You do not have permission to modify this recipe',
        403
      );
    }

    // Step 5: Update visibility with timestamps
    const now = new Date().toISOString();
    const updateData: any = {
      is_public: data.is_public,
      updated_at: now,
    };

    // Set appropriate timestamp based on visibility change
    if (data.is_public && !existingRecipe.is_public) {
      // Changing from private to public
      updateData.published_at = now;
    } else if (!data.is_public && existingRecipe.is_public) {
      // Changing from public to private
      updateData.unpublished_at = now;
    }

    // @ts-ignore - Database types not yet generated from schema
    const { data: updatedRecipe, error: updateError } = await locals.supabase
      .from('recipes')
      .update(updateData)
      .eq('id', id)
      .select('id, is_public, published_at, unpublished_at')
      .single() as { data: RecipeVisibilityDTO | null; error: any };

    if (updateError || !updatedRecipe) {
      console.error('Recipe visibility update error:', updateError);
      return jsonError(
        'INTERNAL_ERROR',
        'Failed to update recipe visibility',
        500
      );
    }

    // Step 6: Return visibility status
    return new Response(JSON.stringify(updatedRecipe), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('PATCH /api/recipes/:id/visibility unexpected error:', error);
    return jsonError(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      500
    );
  }
};
