/**
 * GET /api/profiles/me - Get Own Profile
 * PATCH /api/profiles/me - Update Own Profile
 * 
 * Manages the authenticated user's profile.
 * 
 * @see .ai/api-plan.md - API specifications
 * @see src/types.ts - Type definitions
 */

import type { APIRoute } from 'astro';
import type {
  ProfileDTO,
  UpdateProfileCommand,
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
 * GET /api/profiles/me
 * 
 * Retrieves the authenticated user's profile.
 * Requires authentication via Bearer token.
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

    // Step 2: Fetch user's profile
    // @ts-ignore - Database types not yet generated from schema
    const { data: profile, error: profileError } = await locals.supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single() as { 
        data: {
          id: string;
          username: string;
          display_name: string | null;
          bio: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        } | null; 
        error: any 
      };

    if (profileError || !profile) {
      console.error('Error fetching profile:', profileError);
      return jsonError(
        'NOT_FOUND',
        'Profile not found',
        404
      );
    }

    // Step 3: Build ProfileDTO response (ProfileDTO = ProfileEntity, no recipe counts)
    const profileResponse: ProfileDTO = {
      id: profile.id,
      username: profile.username,
      display_name: profile.display_name,
      bio: profile.bio,
      avatar_url: profile.avatar_url,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
    };

    return new Response(JSON.stringify(profileResponse), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('GET /api/profiles/me unexpected error:', error);
    return jsonError(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      500
    );
  }
};

/**
 * PATCH /api/profiles/me
 * 
 * Updates the authenticated user's profile.
 * All fields are optional for partial updates.
 */
export const PATCH: APIRoute = async ({ request, locals }) => {
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
    let body: UpdateProfileCommand;
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
    if (!body.display_name && !body.bio && !body.avatar_url) {
      return jsonError(
        'VALIDATION_ERROR',
        'At least one field must be provided for update',
        400
      );
    }

    // Step 3: Validate individual fields
    if (body.display_name !== undefined) {
      if (typeof body.display_name !== 'string' || body.display_name.trim().length === 0) {
        return jsonError(
          'VALIDATION_ERROR',
          'display_name must be a non-empty string',
          400,
          'display_name'
        );
      }
      if (body.display_name.length > 100) {
        return jsonError(
          'VALIDATION_ERROR',
          'display_name must not exceed 100 characters',
          400,
          'display_name'
        );
      }
    }

    if (body.bio !== undefined) {
      if (body.bio !== null && typeof body.bio !== 'string') {
        return jsonError(
          'VALIDATION_ERROR',
          'bio must be a string or null',
          400,
          'bio'
        );
      }
      if (body.bio && body.bio.length > 500) {
        return jsonError(
          'VALIDATION_ERROR',
          'bio must not exceed 500 characters',
          400,
          'bio'
        );
      }
    }

    if (body.avatar_url !== undefined) {
      if (body.avatar_url !== null && typeof body.avatar_url !== 'string') {
        return jsonError(
          'VALIDATION_ERROR',
          'avatar_url must be a string or null',
          400,
          'avatar_url'
        );
      }
      // Basic URL validation if provided
      if (body.avatar_url && body.avatar_url.trim().length > 0) {
        try {
          new URL(body.avatar_url);
        } catch {
          return jsonError(
            'VALIDATION_ERROR',
            'avatar_url must be a valid URL',
            400,
            'avatar_url'
          );
        }
      }
    }

    // Step 4: Build update object with only provided fields
    const updates: Partial<{
      display_name: string;
      bio: string | null;
      avatar_url: string | null;
      updated_at: string;
    }> = {
      updated_at: new Date().toISOString(),
    };

    if (body.display_name !== undefined) {
      updates.display_name = body.display_name.trim();
    }
    if (body.bio !== undefined) {
      updates.bio = body.bio ? body.bio.trim() : null;
    }
    if (body.avatar_url !== undefined) {
      updates.avatar_url = body.avatar_url ? body.avatar_url.trim() : null;
    }

    // Step 5: Update profile in database
    // @ts-ignore - Database types not yet generated from schema
    const { data: updatedProfile, error: updateError } = await locals.supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select('*')
      .single() as {
        data: {
          id: string;
          username: string;
          display_name: string | null;
          bio: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        } | null;
        error: any;
      };

    if (updateError || !updatedProfile) {
      console.error('Error updating profile:', updateError);
      return jsonError(
        'INTERNAL_ERROR',
        'Failed to update profile',
        500
      );
    }

    // Step 6: Return updated profile
    const profileResponse: ProfileDTO = {
      id: updatedProfile.id,
      username: updatedProfile.username,
      display_name: updatedProfile.display_name,
      bio: updatedProfile.bio,
      avatar_url: updatedProfile.avatar_url,
      created_at: updatedProfile.created_at,
      updated_at: updatedProfile.updated_at,
    };

    return new Response(JSON.stringify(profileResponse), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('PATCH /api/profiles/me unexpected error:', error);
    return jsonError(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      500
    );
  }
};
