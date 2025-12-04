/**
 * GET /api/profiles/:username - Public Profile View
 * 
 * Retrieves a user's public profile by username.
 * Includes public recipe count but no private information.
 * 
 * @see .ai/api-plan.md - API specifications
 * @see src/types.ts - Type definitions
 */

import type { APIRoute } from 'astro';
import type {
  PublicProfileDTO,
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
 * GET /api/profiles/:username
 * 
 * Retrieves a public profile by username.
 * No authentication required.
 */
export const GET: APIRoute = async ({ params, locals }) => {
  try {
    // Step 1: Validate username parameter
    const { username } = params;
    if (!username || username.trim().length === 0) {
      return jsonError(
        'VALIDATION_ERROR',
        'Username parameter is required',
        400,
        'username'
      );
    }

    // Step 2: Fetch profile by username
    // @ts-ignore - Database types not yet generated from schema
    const { data: profile, error: profileError } = await locals.supabase
      .from('profiles')
      .select('username, display_name, avatar_url, created_at')
      .eq('username', username)
      .single() as {
        data: {
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
        } | null;
        error: any;
      };

    if (profileError || !profile) {
      return jsonError(
        'NOT_FOUND',
        `Profile with username '${username}' not found`,
        404
      );
    }

    // Step 3: Get public recipe count for this user
    // First get the user_id from the profile
    // @ts-ignore - Database types not yet generated from schema
    const { data: userProfile, error: userError } = await locals.supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single() as {
        data: { id: string } | null;
        error: any;
      };

    if (userError || !userProfile) {
      console.error('Error fetching user ID:', userError);
      return jsonError(
        'INTERNAL_ERROR',
        'Failed to fetch profile information',
        500
      );
    }

    // @ts-ignore - Database types not yet generated from schema
    const { count, error: countError } = await locals.supabase
      .from('recipes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userProfile.id)
      .eq('is_public', true) as { count: number | null; error: any };

    if (countError) {
      console.error('Error counting public recipes:', countError);
      return jsonError(
        'INTERNAL_ERROR',
        'Failed to fetch recipe count',
        500
      );
    }

    // Step 4: Build PublicProfileDTO response
    const publicProfile: PublicProfileDTO = {
      username: profile.username,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
      created_at: profile.created_at,
      public_recipe_count: count || 0,
    };

    return new Response(JSON.stringify(publicProfile), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('GET /api/profiles/:username unexpected error:', error);
    return jsonError(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      500
    );
  }
};
