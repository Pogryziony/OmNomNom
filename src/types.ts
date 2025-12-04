/**
 * Type Definitions for OmNomNom Recipe Management Application
 * 
 * This file contains all DTO (Data Transfer Object) and Command Model types
 * used by the API. Types are derived from database entity definitions and
 * follow the API plan specifications.
 * 
 * @see .ai/api-plan.md - API endpoint specifications
 * @see .ai/db-plan.md - Database schema definitions
 */

// =============================================================================
// DATABASE ENTITY TYPES
// =============================================================================
// These types represent the actual database table structures

/**
 * User profile extending Supabase auth.users
 * Table: profiles
 */
export interface ProfileEntity {
  id: string; // uuid (references auth.users.id)
  username: string; // unique, 3-20 characters
  display_name: string | null; // defaults to username
  bio: string | null; // max 500 characters
  avatar_url: string | null; // profile picture URL
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
}

/**
 * Master ingredient list (normalized)
 * Table: ingredients
 */
export interface IngredientEntity {
  id: string; // uuid
  name: string; // lowercase, trimmed, unique
  display_name: string; // preserves capitalization
  category: string | null; // produce, dairy, meat, pantry, spices, etc.
  created_at: string; // timestamptz
}

/**
 * User recipe (private or public)
 * Table: recipes
 */
export interface RecipeEntity {
  id: string; // uuid
  user_id: string; // uuid (references auth.users.id)
  title: string; // max 200 characters
  description: string | null; // max 5000 characters
  instructions: string; // required
  servings: number; // must be > 0
  prep_time: number | null; // minutes, must be >= 0
  cook_time: number | null; // minutes, must be >= 0
  image_url: string | null; // recipe image URL
  is_public: boolean; // default false
  published_at: string | null; // timestamptz, set when first published
  unpublished_at: string | null; // timestamptz, set when unpublished
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
}

/**
 * Junction table linking recipes to ingredients
 * Table: recipe_ingredients
 */
export interface RecipeIngredientEntity {
  id: string; // uuid
  recipe_id: string; // uuid (references recipes.id)
  ingredient_id: string; // uuid (references ingredients.id)
  quantity: number; // numeric(10,2), must be > 0
  quantity_display: string | null; // text override (e.g., "a pinch", "to taste")
  unit: string; // cup, g, ml, tbsp, tsp, etc.
  order_index: number; // display order, must be >= 0
  notes: string | null; // special notes (e.g., "optional")
}

/**
 * User shopping list (one per user)
 * Table: shopping_lists
 */
export interface ShoppingListEntity {
  id: string; // uuid
  user_id: string; // uuid (references auth.users.id), unique
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
}

/**
 * Shopping list item
 * Table: shopping_list_items
 */
export interface ShoppingListItemEntity {
  id: string; // uuid
  shopping_list_id: string; // uuid (references shopping_lists.id)
  source_recipe_id: string | null; // uuid (references recipes.id), optional
  name: string; // item name
  quantity: number; // numeric(10,2), must be > 0
  unit: string; // measurement unit
  category: string | null; // for grouping in UI
  is_checked: boolean; // default false
  created_at: string; // timestamptz
}

// =============================================================================
// AUTHENTICATION TYPES
// =============================================================================

/**
 * Authenticated user from Supabase Auth
 */
export interface AuthUser {
  id: string;
  email: string;
  created_at: string;
}

/**
 * Authentication session with JWT tokens
 */
export interface AuthSession {
  access_token: string;
  refresh_token: string;
}

/**
 * Sign up request payload
 * Endpoint: POST /auth (Supabase SDK: supabase.auth.signUp())
 */
export interface SignUpRequest {
  email: string;
  password: string; // min 8 chars, 1 uppercase, 1 number
  options?: {
    data?: {
      username?: string; // 3-20 characters
      display_name?: string;
    };
  };
}

/**
 * Sign up response
 */
export interface SignUpResponse {
  user: AuthUser;
  session: AuthSession;
}

/**
 * Sign in request payload
 * Endpoint: POST /auth (Supabase SDK: supabase.auth.signInWithPassword())
 */
export interface SignInRequest {
  email: string;
  password: string;
}

/**
 * Sign in response
 */
export interface SignInResponse {
  user: AuthUser;
  session: AuthSession;
}

// =============================================================================
// PROFILE DTOs
// =============================================================================

/**
 * Complete user profile DTO
 * Endpoint: GET /api/profiles/me
 */
export type ProfileDTO = ProfileEntity;

/**
 * Update profile command (all fields optional)
 * Endpoint: PATCH /api/profiles/me
 */
export type UpdateProfileCommand = Partial<
  Pick<ProfileEntity, 'username' | 'display_name' | 'bio' | 'avatar_url'>
>;

/**
 * Public profile DTO (limited fields for users with public recipes)
 * Endpoint: GET /api/profiles/:username
 */
export interface PublicProfileDTO {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  public_recipe_count: number;
}

// =============================================================================
// RECIPE DTOs
// =============================================================================

/**
 * Recipe ingredient input for recipe creation/update
 * Used in CreateRecipeCommand and UpdateRecipeCommand
 */
export interface RecipeIngredientInput {
  ingredient_name: string; // will be normalized to lowercase
  quantity: number; // must be > 0 if quantity_display not provided
  quantity_display?: string | null; // text override (e.g., "a pinch")
  unit: string; // required
  order_index: number; // must be >= 0
  notes?: string | null; // optional notes
}

/**
 * Recipe ingredient with full ingredient details
 * Used in RecipeDTO responses
 */
export interface RecipeIngredientWithDetails
  extends Omit<RecipeIngredientEntity, 'ingredient_id'> {
  ingredient: IngredientEntity;
}

/**
 * Create recipe command
 * Endpoint: POST /api/recipes
 */
export interface CreateRecipeCommand {
  title: string; // required, 1-200 characters
  description?: string | null; // optional, max 5000 characters
  instructions: string; // required
  servings: number; // required, must be > 0
  prep_time?: number | null; // optional, must be >= 0
  cook_time?: number | null; // optional, must be >= 0
  image_url?: string | null; // optional
  ingredients: RecipeIngredientInput[]; // required, at least one
}

/**
 * Complete recipe DTO with author and ingredients
 * Endpoint: GET /api/recipes/:id
 */
export interface RecipeDTO extends RecipeEntity {
  author: PublicProfileDTO;
  ingredients: RecipeIngredientWithDetails[];
}

/**
 * Abbreviated recipe for list views
 * Endpoint: GET /api/recipes
 */
export type RecipeListItemDTO = Omit<
  RecipeEntity,
  'instructions' | 'description' | 'user_id'
>;

/**
 * Update recipe command (all fields optional)
 * Endpoint: PUT /api/recipes/:id
 */
export type UpdateRecipeCommand = Partial<CreateRecipeCommand>;

/**
 * Recipe visibility status DTO
 * Endpoint: PATCH /api/recipes/:id/visibility (response)
 */
export interface RecipeVisibilityDTO {
  id: string;
  is_public: boolean;
  published_at: string | null;
  unpublished_at: string | null;
}

/**
 * Toggle recipe visibility command
 * Endpoint: PATCH /api/recipes/:id/visibility (request)
 */
export interface ToggleVisibilityCommand {
  is_public: boolean;
}

// =============================================================================
// PUBLIC FEED DTOs
// =============================================================================

/**
 * Public recipe DTO with author info
 * Endpoint: GET /api/recipes/public
 */
export interface PublicRecipeDTO {
  id: string;
  title: string;
  description: string | null;
  servings: number;
  prep_time: number | null;
  cook_time: number | null;
  image_url: string | null;
  published_at: string;
  author: PublicProfileDTO;
}

// =============================================================================
// RECIPE SCALING DTOs
// =============================================================================

/**
 * Scale recipe command
 * Endpoint: POST /api/recipes/:id/scale
 */
export interface ScaleRecipeCommand {
  desired_servings: number; // must be > 0
}

/**
 * Scaled ingredient DTO
 * Used in ScaledRecipeDTO
 */
export interface ScaledIngredientDTO {
  ingredient: {
    name: string;
    display_name: string;
  };
  original_quantity: number;
  scaled_quantity: number;
  quantity_display: string; // formatted quantity (e.g., "2", "1½", "to taste")
  unit: string;
  notes: string | null; // e.g., "*Not scaled - adjust to taste"
}

/**
 * Scaled recipe response
 * Endpoint: POST /api/recipes/:id/scale (response)
 */
export interface ScaledRecipeDTO {
  original_servings: number;
  desired_servings: number;
  scaling_factor: number;
  scaled_ingredients: ScaledIngredientDTO[];
}

// =============================================================================
// SHOPPING LIST DTOs
// =============================================================================

/**
 * Shopping list item DTO
 * Used in ShoppingListDTO and responses
 */
export type ShoppingListItemDTO = ShoppingListItemEntity;

/**
 * Complete shopping list with items
 * Endpoint: GET /api/shopping-lists
 */
export interface ShoppingListDTO extends ShoppingListEntity {
  items: ShoppingListItemDTO[];
  grouped_by_category: Record<string, ShoppingListItemDTO[]>;
}

/**
 * Generate shopping list from recipes command
 * Endpoint: POST /api/shopping-lists/generate
 */
export interface GenerateShoppingListCommand {
  recipe_ids: string[]; // array of recipe UUIDs, must own all recipes
  replace_existing: boolean; // if true, clear existing items first
}

/**
 * Generate shopping list response
 * Endpoint: POST /api/shopping-lists/generate (response)
 */
export interface GenerateShoppingListResponse {
  id: string;
  items_added: number;
  items_updated: number;
  items: ShoppingListItemDTO[];
}

/**
 * Add manual item to shopping list command
 * Endpoint: POST /api/shopping-lists/items
 */
export interface AddShoppingListItemCommand {
  name: string; // required, cannot be empty
  quantity: number; // required, must be > 0
  unit: string; // required
  category?: string | null; // optional
}

/**
 * Update shopping list item command
 * Endpoint: PATCH /api/shopping-lists/items/:id
 */
export interface UpdateShoppingListItemCommand {
  quantity?: number; // optional, must be > 0 if provided
  is_checked?: boolean; // optional
}

// =============================================================================
// COMMON RESPONSE TYPES
// =============================================================================

/**
 * Standard delete response
 * Used by DELETE endpoints
 */
export interface DeleteResponse {
  message: string;
  id: string;
}

/**
 * Clear checked items response
 * Endpoint: DELETE /api/shopping-lists/items/checked
 */
export interface ClearCheckedItemsResponse {
  message: string;
  items_deleted: number;
}

// =============================================================================
// PAGINATION TYPES
// =============================================================================

/**
 * Pagination query parameters
 * Used in list endpoints
 */
export interface PaginationParams {
  page?: number; // default 1
  limit?: number; // default 20, max 100
  sort?: string; // sort field (e.g., "created_at", "title")
  order?: 'asc' | 'desc'; // default "desc"
  search?: string; // optional search query
}

/**
 * Pagination metadata
 * Included in paginated responses
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

/**
 * Generic paginated response wrapper
 * Used by list endpoints (GET /api/recipes, GET /api/recipes/public)
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

// =============================================================================
// ERROR TYPES
// =============================================================================

/**
 * API error codes
 */
export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'AUTHORIZATION_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMIT_EXCEEDED'
  | 'INTERNAL_ERROR';

/**
 * API error object
 */
export interface ApiError {
  code: ApiErrorCode;
  message: string;
  field?: string; // field that failed validation
  details?: Record<string, unknown>;
}

/**
 * Standard error response format
 * Returned by all API endpoints on error
 */
export interface ApiErrorResponse {
  error: ApiError;
}

/**
 * Rate limit exceeded error response
 * HTTP 429 Too Many Requests
 */
export interface RateLimitErrorResponse extends ApiErrorResponse {
  error: ApiError & {
    retry_after: number; // seconds until rate limit resets
  };
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Type guard to check if response is an error
 */
export function isApiError(response: unknown): response is ApiErrorResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'error' in response &&
    typeof (response as ApiErrorResponse).error === 'object'
  );
}

/**
 * Type guard to check if error is rate limit exceeded
 */
export function isRateLimitError(
  response: unknown
): response is RateLimitErrorResponse {
  return (
    isApiError(response) &&
    response.error.code === 'RATE_LIMIT_EXCEEDED' &&
    'retry_after' in response.error
  );
}
