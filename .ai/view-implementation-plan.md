# API Endpoint Implementation Plan: POST /api/recipes (Create Recipe)

## 1. Endpoint Overview
Creates a new private recipe for the authenticated user, including its structured list of ingredients. Ingredient names are normalized and deduplicated against the master `ingredients` table; recipe-ingredient links are persisted in `recipe_ingredients`. The recipe defaults to `is_public = false`.

## 2. Request Details
- HTTP Method: POST
- URL Structure: /api/recipes
- Parameters:
  - Required: none (path/query)
  - Optional: none (path/query)
- Request Body (JSON): CreateRecipeCommand
```json
{
  "title": "Classic Margherita Pizza",
  "description": "Authentic Italian pizza with fresh mozzarella and basil",
  "instructions": "1. Prepare dough\n2. Add sauce\n3. Add toppings\n4. Bake",
  "servings": 4,
  "prep_time": 30,
  "cook_time": 15,
  "image_url": "https://...",
  "ingredients": [
    { "ingredient_name": "pizza dough", "quantity": 1, "unit": "ball", "order_index": 0 },
    { "ingredient_name": "tomato sauce", "quantity": 0.5, "unit": "cup", "order_index": 1 },
    { "ingredient_name": "fresh mozzarella", "quantity": 200, "unit": "g", "order_index": 2 },
    { "ingredient_name": "fresh basil", "quantity_display": "to taste", "unit": "leaves", "order_index": 3, "notes": "optional" }
  ]
}
```

## 3. Used Types
- Command Models / DTOs (from `src/types.ts`):
  - CreateRecipeCommand
  - RecipeIngredientInput
  - RecipeDTO (response)
  - RecipeIngredientWithDetails (nested in RecipeDTO)
  - ApiErrorResponse (errors)

## 4. Response Details
- Success: 201 Created
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "title": "Classic Margherita Pizza",
  "description": "Authentic Italian pizza...",
  "instructions": "1. Prepare...",
  "servings": 4,
  "prep_time": 30,
  "cook_time": 15,
  "image_url": "https://...",
  "is_public": false,
  "published_at": null,
  "unpublished_at": null,
  "created_at": "2025-10-26T10:00:00Z",
  "updated_at": "2025-10-26T10:00:00Z",
  "author": { "username": "johndoe", "display_name": "John Doe", "avatar_url": null, "created_at": "...", "public_recipe_count": 0 },
  "ingredients": [
    {
      "id": "uuid",
      "recipe_id": "uuid",
      "quantity": 1,
      "quantity_display": null,
      "unit": "ball",
      "order_index": 0,
      "notes": null,
      "ingredient": { "id": "uuid", "name": "pizza dough", "display_name": "Pizza Dough", "category": "pantry", "created_at": "..." }
    }
  ]
}
```
- Errors:
  - 400 Bad Request (validation failures)
  - 401 Unauthorized (no/invalid auth)
  - 409 Conflict (ingredient unique constraint conflict edge, rare with upsert)
  - 500 Internal Server Error (unexpected)

## 5. Data Flow
1. AuthN:
   - Read `Authorization: Bearer <jwt>` header in middleware or endpoint.
   - Resolve current user via Supabase Auth; obtain `user.id`.
2. Validation:
   - Validate payload against CreateRecipeCommand and schema constraints (see section 6).
3. Insert Recipe:
   - `supabase.from('recipes').insert({ user_id: user.id, title, description, instructions, servings, prep_time, cook_time, image_url, is_public: false }).select('*').single()`
   - RLS policy enforces `auth.uid() = user_id`.
4. Upsert Ingredients:
   - For each ingredient input:
     - Normalize `ingredient_name_norm = lower(trim(ingredient_name))`.
     - Build `display_name` (Title Case) if creating new row.
     - `supabase.from('ingredients').upsert({ name: ingredient_name_norm, display_name, category: null }, { onConflict: 'name' }).select('*')`.
5. Insert Recipe-Ingredients:
   - For each resolved ingredient:
     - `supabase.from('recipe_ingredients').insert({ recipe_id: recipe.id, ingredient_id: ing.id, quantity, quantity_display, unit, order_index, notes }).select('*')`.
6. Fetch Author Profile (public subset):
   - Join-like fetch: `profiles` by `id = user.id`; compute `public_recipe_count` via count of `recipes` where `is_public = true` (optional for 201; can be 0 initially).
7. Assemble RecipeDTO:
   - Combine `recipe`, `author`, and `recipe_ingredients` joined with `ingredients`.
8. Respond 201 with RecipeDTO.

Note: Supabase does not support multi-statement client-side transactions. To approximate atomicity, perform best-effort cleanup on failure (delete recipe on any downstream failure), and consider an RPC function for a fully atomic path post-MVP.

## 6. Security Considerations
- Authentication: Required (Supabase JWT). Reject if missing/invalid (401).
- Authorization: RLS ensures only owner can create their own recipe (`auth.uid() = user_id`). Don’t accept `user_id` from client; compute from token.
- Input Hardening: Trim strings; enforce maximum lengths to prevent DB errors and resource abuse.
- Rate Limiting: Apply middleware limits (e.g., 100 req/min authenticated) to protect from abuse.
- Data Exposure: Return only necessary fields; no sensitive user metadata.

## 7. Error Handling
- Validation Errors → 400 with `ApiErrorResponse { code: 'VALIDATION_ERROR', field?, message }`.
- Auth Errors → 401 with `AUTHENTICATION_ERROR`.
- RLS/Ownership/Policy denial (should not occur on create) → 403 if surfaced.
- Not Found (not applicable for create) → 404.
- Conflict on ingredient name upsert (should be handled by onConflict) → 409.
- Unexpected DB/Network issues → 500 with `INTERNAL_ERROR`.
- Logging: Log server-side with structured context (endpoint, user_id, payload hash, supabase error). No DB error table is defined; if added later, persist minimal error record async.

## 8. Performance Considerations
- Batch Operations: Prefer batching where possible. Supabase allows bulk insert for `recipe_ingredients` to reduce round-trips.
- Index Use: Ingredient uniqueness by `name` leverages index; recipe fetches use created indexes as per schema.
- N+1: Resolve all ingredients first, then bulk insert recipe_ingredients.
- Response Size: Return only required fields—omit large blobs.
- Caching: None for create route; rely on client caches for subsequent GETs.

## 9. Implementation Steps
1. Route File
   - Create `src/pages/api/recipes/index.ts` to handle POST (and optionally GET list).
2. Types & Parsing
   - Import `CreateRecipeCommand`, `RecipeDTO`, `ApiErrorResponse` from `src/types.ts`.
   - Parse JSON body; validate schema (manual checks or zod/yup if allowed by rules; otherwise manual).
3. AuthN
   - Read `Authorization` header; call `locals.supabase.auth.getUser(token)` (or reuse user from middleware if attached). If missing/invalid → 401.
4. Validate Payload (400 on failure)
   - title: string (1..200)
   - instructions: non-empty string
   - servings: number > 0
   - prep_time/cook_time: null | number >= 0
   - description: null | string length <= 5000
   - ingredients: non-empty array
   - Each ingredient:
     - ingredient_name: non-empty string
     - unit: non-empty string
     - order_index: number >= 0
     - quantity: if quantity_display not provided → number > 0
5. Insert Recipe (owner = auth user)
   - With `is_public = false` by default.
6. Upsert Ingredients
   - Normalize names to lowercase-trim; build `display_name` if creating.
   - Use `onConflict: 'name'`.
7. Insert Recipe-Ingredients
   - Prefer bulk insert in a single call with `.insert([...]).select('*')`.
8. Fetch Author Public Profile & public count (optional for 201)
   - profiles: select minimal fields
   - recipes: count where is_public = true
9. Assemble RecipeDTO
   - Map DB rows to DTO structure with nested `ingredient` objects.
10. Cleanup on Partial Failure
    - If any step after recipe insert fails, attempt `supabase.from('recipes').delete().eq('id', recipe.id)`.
11. Respond
    - 201 with DTO on success; errors as per section 7.
12. Tests
    - Happy path create
    - Validation failures (missing title, servings ≤ 0, empty ingredients)
    - Ingredient with quantity_display only
    - RLS enforced: missing token → 401
    - Idempotent upsert of existing ingredient

## 10. Pseudocode Sketch (Astro API Route)
```ts
// src/pages/api/recipes/index.ts
import type { APIRoute } from 'astro';
import type { CreateRecipeCommand, RecipeDTO, ApiErrorResponse } from '@/types';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonError('AUTHENTICATION_ERROR', 'Missing token', 401);
    }
    const token = authHeader.slice('Bearer '.length);
    const { data: { user }, error: userErr } = await locals.supabase.auth.getUser(token);
    if (userErr || !user) return jsonError('AUTHENTICATION_ERROR', 'Invalid token', 401);

    const body = (await request.json()) as CreateRecipeCommand;
    const val = validateCreateRecipe(body);
    if (!val.ok) return jsonError('VALIDATION_ERROR', val.message, 400, val.field);

    // 1) insert recipe
    const { data: recipe, error: recErr } = await locals.supabase
      .from('recipes')
      .insert({ ...toRecipeRow(body), user_id: user.id, is_public: false })
      .select('*')
      .single();
    if (recErr || !recipe) return jsonError('INTERNAL_ERROR', 'Failed to create recipe', 500);

    // 2) upsert ingredients and 3) insert recipe_ingredients (bulk)
    const resolved = await resolveIngredients(locals.supabase, body.ingredients);
    const { data: links, error: linkErr } = await locals.supabase
      .from('recipe_ingredients')
      .insert(toRecipeIngredientRows(recipe.id, resolved))
      .select('*');
    if (linkErr) {
      await locals.supabase.from('recipes').delete().eq('id', recipe.id);
      return jsonError('INTERNAL_ERROR', 'Failed to attach ingredients', 500);
    }

    // 4) fetch author public profile and assemble DTO
    const author = await fetchPublicAuthor(locals.supabase, user.id);
    const dto: RecipeDTO = await assembleRecipeDTO(locals.supabase, recipe, author, links);
    return new Response(JSON.stringify(dto), { status: 201, headers: { 'content-type': 'application/json' } });
  } catch (e) {
    console.error('POST /api/recipes error', e);
    return jsonError('INTERNAL_ERROR', 'Unexpected error', 500);
  }
};
```

