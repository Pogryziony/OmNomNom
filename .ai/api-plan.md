# REST API Plan

**Project:** OmNomNom - Recipe Management Application  
**Version:** 1.0  
**Date:** October 25, 2025  
**Architecture:** Astro 5 API Routes + Supabase Backend

---

## Overview

This REST API provides endpoints for recipe management, public sharing, recipe scaling, and shopping list generation. The API is built using Astro 5 server-side API routes with Supabase as the backend database and authentication provider.

**Base URL:** `/api`

**Authentication:** Supabase JWT tokens via `Authorization: Bearer <token>` header

**Content-Type:** `application/json`

---

## 1. Resources

| Resource | Database Table | Description |
|----------|----------------|-------------|
| Profiles | `profiles` | User profile information |
| Recipes | `recipes` | User recipes (private and public) |
| Ingredients | `ingredients` | Master ingredient list |
| Recipe Ingredients | `recipe_ingredients` | Ingredients within recipes |
| Public Feed | `recipes` (filtered) | Public recipes feed |
| Shopping Lists | `shopping_lists` | User shopping lists |
| Shopping List Items | `shopping_list_items` | Items in shopping lists |

---

## 2. Endpoints

### 2.1 Authentication

**Note:** Authentication is handled by Supabase Auth. These are reference endpoints provided by Supabase client SDK.

#### Sign Up

**Method:** `POST`  
**Path:** Supabase Auth SDK: `supabase.auth.signUp()`  
**Description:** Create a new user account with email and password  
**Authentication:** None (public)

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "options": {
    "data": {
      "username": "johndoe",
      "display_name": "John Doe"
    }
  }
}
```

**Success Response:** `200 OK`
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "created_at": "2025-10-25T10:00:00Z"
  },
  "session": {
    "access_token": "jwt_token",
    "refresh_token": "refresh_token"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invalid email format or password too weak
- `422 Unprocessable Entity` - Email already registered

**Validation:**
- Email: valid email format
- Password: minimum 8 characters, 1 uppercase, 1 number
- Username: 3-20 characters (enforced at profile creation)

---

#### Sign In

**Method:** `POST`  
**Path:** Supabase Auth SDK: `supabase.auth.signInWithPassword()`  
**Description:** Authenticate user with email and password  
**Authentication:** None (public)

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Success Response:** `200 OK`
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  },
  "session": {
    "access_token": "jwt_token",
    "refresh_token": "refresh_token"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invalid credentials
- `401 Unauthorized` - Email not verified

---

#### Sign Out

**Method:** `POST`  
**Path:** Supabase Auth SDK: `supabase.auth.signOut()`  
**Description:** Invalidate user session  
**Authentication:** Required

**Success Response:** `200 OK`
```json
{
  "message": "Signed out successfully"
}
```

---

### 2.2 Profiles

#### Get Own Profile

**Method:** `GET`  
**Path:** `/api/profiles/me`  
**Description:** Retrieve authenticated user's profile  
**Authentication:** Required

**Success Response:** `200 OK`
```json
{
  "id": "uuid",
  "username": "johndoe",
  "display_name": "John Doe",
  "bio": "Home cook passionate about Italian cuisine",
  "avatar_url": "https://storage.supabase.co/...",
  "created_at": "2025-10-20T10:00:00Z",
  "updated_at": "2025-10-25T10:00:00Z"
}
```

**Error Responses:**
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Profile not found

---

#### Update Profile

**Method:** `PATCH`  
**Path:** `/api/profiles/me`  
**Description:** Update authenticated user's profile  
**Authentication:** Required

**Request Body:**
```json
{
  "username": "johndoe",
  "display_name": "John Doe",
  "bio": "Home cook passionate about Italian cuisine",
  "avatar_url": "https://storage.supabase.co/..."
}
```

**Success Response:** `200 OK`
```json
{
  "id": "uuid",
  "username": "johndoe",
  "display_name": "John Doe",
  "bio": "Home cook passionate about Italian cuisine",
  "avatar_url": "https://storage.supabase.co/...",
  "updated_at": "2025-10-25T12:00:00Z"
}
```

**Error Responses:**
- `400 Bad Request` - Validation failed
- `401 Unauthorized` - Not authenticated
- `409 Conflict` - Username already taken

**Validation:**
- username: 3-20 characters, alphanumeric
- bio: max 500 characters
- All fields optional

---

#### Get Public Profile

**Method:** `GET`  
**Path:** `/api/profiles/:username`  
**Description:** Retrieve public profile of user with published recipes  
**Authentication:** Optional (public for users with public recipes)

**Success Response:** `200 OK`
```json
{
  "username": "johndoe",
  "display_name": "John Doe",
  "avatar_url": "https://storage.supabase.co/...",
  "created_at": "2025-10-20T10:00:00Z",
  "public_recipe_count": 15
}
```

**Error Responses:**
- `404 Not Found` - Profile not found or user has no public recipes

---

### 2.3 Recipes

#### Create Recipe

**Method:** `POST`  
**Path:** `/api/recipes`  
**Description:** Create a new private recipe  
**Authentication:** Required

**Request Body:**
```json
{
  "title": "Classic Margherita Pizza",
  "description": "Authentic Italian pizza with fresh mozzarella and basil",
  "instructions": "1. Prepare dough\n2. Add sauce\n3. Add toppings\n4. Bake at 450°F",
  "servings": 4,
  "prep_time": 30,
  "cook_time": 15,
  "image_url": "https://storage.supabase.co/...",
  "ingredients": [
    {
      "ingredient_name": "pizza dough",
      "quantity": 1,
      "unit": "ball",
      "order_index": 0
    },
    {
      "ingredient_name": "tomato sauce",
      "quantity": 0.5,
      "unit": "cup",
      "order_index": 1
    },
    {
      "ingredient_name": "fresh mozzarella",
      "quantity": 200,
      "unit": "g",
      "order_index": 2
    },
    {
      "ingredient_name": "fresh basil",
      "quantity_display": "to taste",
      "unit": "leaves",
      "order_index": 3,
      "notes": "optional"
    }
  ]
}
```

**Success Response:** `201 Created`
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "title": "Classic Margherita Pizza",
  "description": "Authentic Italian pizza with fresh mozzarella and basil",
  "instructions": "1. Prepare dough\n2. Add sauce\n3. Add toppings\n4. Bake at 450°F",
  "servings": 4,
  "prep_time": 30,
  "cook_time": 15,
  "image_url": "https://storage.supabase.co/...",
  "is_public": false,
  "created_at": "2025-10-25T10:00:00Z",
  "updated_at": "2025-10-25T10:00:00Z",
  "ingredients": [
    {
      "id": "uuid",
      "ingredient": {
        "id": "uuid",
        "name": "pizza dough",
        "display_name": "Pizza Dough"
      },
      "quantity": 1,
      "unit": "ball",
      "order_index": 0
    }
  ]
}
```

**Error Responses:**
- `400 Bad Request` - Validation failed (invalid fields, missing required data)
- `401 Unauthorized` - Not authenticated
- `422 Unprocessable Entity` - Invalid ingredient data

**Validation:**
- title: required, 1-200 characters
- instructions: required
- servings: required, must be > 0
- prep_time: optional, must be >= 0
- cook_time: optional, must be >= 0
- description: optional, max 5000 characters
- ingredients: required, at least one ingredient
- Each ingredient:
  - ingredient_name: required
  - quantity: required if quantity_display not provided, must be > 0
  - unit: required
  - order_index: required, must be >= 0

**Business Logic:**
- Recipe defaults to `is_public = false`
- Ingredient names are normalized to lowercase in `ingredients` table
- If ingredient doesn't exist in master list, it's created automatically
- Recipe is linked to authenticated user's `user_id`

---

#### List Own Recipes

**Method:** `GET`  
**Path:** `/api/recipes`  
**Description:** Retrieve authenticated user's recipes (private and public)  
**Authentication:** Required

**Query Parameters:**
- `page` (number, default: 1) - Page number
- `limit` (number, default: 20, max: 100) - Items per page
- `sort` (string, default: "created_at") - Sort field: `created_at`, `updated_at`, `title`
- `order` (string, default: "desc") - Sort order: `asc`, `desc`
- `search` (string, optional) - Search by title (case-insensitive)
- `is_public` (boolean, optional) - Filter by visibility

**Example:** `/api/recipes?page=1&limit=20&sort=created_at&order=desc&search=pizza`

**Success Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Classic Margherita Pizza",
      "description": "Authentic Italian pizza",
      "servings": 4,
      "prep_time": 30,
      "cook_time": 15,
      "image_url": "https://storage.supabase.co/...",
      "is_public": false,
      "created_at": "2025-10-25T10:00:00Z",
      "updated_at": "2025-10-25T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "total_pages": 3
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Not authenticated
- `400 Bad Request` - Invalid query parameters

---

#### Get Recipe by ID

**Method:** `GET`  
**Path:** `/api/recipes/:id`  
**Description:** Retrieve a single recipe with full details  
**Authentication:** Required for private recipes, optional for public recipes

**Success Response:** `200 OK`
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "title": "Classic Margherita Pizza",
  "description": "Authentic Italian pizza with fresh mozzarella and basil",
  "instructions": "1. Prepare dough\n2. Add sauce\n3. Add toppings\n4. Bake at 450°F",
  "servings": 4,
  "prep_time": 30,
  "cook_time": 15,
  "image_url": "https://storage.supabase.co/...",
  "is_public": false,
  "published_at": null,
  "created_at": "2025-10-25T10:00:00Z",
  "updated_at": "2025-10-25T10:00:00Z",
  "author": {
    "username": "johndoe",
    "display_name": "John Doe",
    "avatar_url": "https://storage.supabase.co/..."
  },
  "ingredients": [
    {
      "id": "uuid",
      "ingredient": {
        "id": "uuid",
        "name": "pizza dough",
        "display_name": "Pizza Dough",
        "category": "pantry"
      },
      "quantity": 1,
      "quantity_display": null,
      "unit": "ball",
      "order_index": 0,
      "notes": null
    },
    {
      "id": "uuid",
      "ingredient": {
        "id": "uuid",
        "name": "fresh basil",
        "display_name": "Fresh Basil",
        "category": "produce"
      },
      "quantity": 0,
      "quantity_display": "to taste",
      "unit": "leaves",
      "order_index": 3,
      "notes": "optional"
    }
  ]
}
```

**Error Responses:**
- `401 Unauthorized` - Not authenticated (for private recipes)
- `403 Forbidden` - User does not own this private recipe
- `404 Not Found` - Recipe not found

**Authorization:**
- Private recipes: only accessible by owner
- Public recipes: accessible by all users (authenticated and anonymous)

---

#### Update Recipe

**Method:** `PUT`  
**Path:** `/api/recipes/:id`  
**Description:** Update an existing recipe (owner only)  
**Authentication:** Required

**Request Body:** (Same structure as Create Recipe, all fields optional except ingredients if provided)
```json
{
  "title": "Updated Margherita Pizza",
  "description": "Updated description",
  "servings": 6,
  "ingredients": [
    {
      "ingredient_name": "pizza dough",
      "quantity": 1.5,
      "unit": "ball",
      "order_index": 0
    }
  ]
}
```

**Success Response:** `200 OK`
```json
{
  "id": "uuid",
  "title": "Updated Margherita Pizza",
  "updated_at": "2025-10-25T12:00:00Z",
  ...
}
```

**Error Responses:**
- `400 Bad Request` - Validation failed
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - User does not own this recipe
- `404 Not Found` - Recipe not found

**Validation:** Same as Create Recipe

**Business Logic:**
- If ingredients array is provided, all existing ingredients are replaced
- `updated_at` timestamp is automatically updated
- `is_public` status cannot be changed via this endpoint (use toggle endpoint)

---

#### Delete Recipe

**Method:** `DELETE`  
**Path:** `/api/recipes/:id`  
**Description:** Delete a recipe (owner only)  
**Authentication:** Required

**Success Response:** `200 OK`
```json
{
  "message": "Recipe deleted successfully",
  "id": "uuid"
}
```

**Error Responses:**
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - User does not own this recipe
- `404 Not Found` - Recipe not found

**Business Logic:**
- Cascade deletes all `recipe_ingredients` entries
- Removes recipe from shopping lists (via `SET NULL` on `source_recipe_id`)
- Removes recipe from public feed if published

---

#### Toggle Recipe Visibility

**Method:** `PATCH`  
**Path:** `/api/recipes/:id/visibility`  
**Description:** Toggle recipe between private and public  
**Authentication:** Required

**Request Body:**
```json
{
  "is_public": true
}
```

**Success Response:** `200 OK`
```json
{
  "id": "uuid",
  "is_public": true,
  "published_at": "2025-10-25T12:00:00Z",
  "unpublished_at": null
}
```

**Error Responses:**
- `400 Bad Request` - Invalid is_public value
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - User does not own this recipe
- `404 Not Found` - Recipe not found

**Business Logic:**
- If changing from private to public: set `published_at = NOW()`
- If changing from public to private: set `unpublished_at = NOW()`
- Database trigger handles timestamp updates automatically

---

### 2.4 Public Feed

#### List Public Recipes

**Method:** `GET`  
**Path:** `/api/recipes/public`  
**Description:** Retrieve public recipes feed (accessible to all users)  
**Authentication:** Optional (public endpoint)

**Query Parameters:**
- `page` (number, default: 1) - Page number
- `limit` (number, default: 20, max: 100) - Items per page
- `search` (string, optional) - Search by title or ingredients
- `author` (string, optional) - Filter by author username
- `sort` (string, default: "published_at") - Sort field: `published_at`, `created_at`, `title`
- `order` (string, default: "desc") - Sort order: `asc`, `desc`

**Example:** `/api/recipes/public?page=1&limit=20&search=pizza&author=johndoe`

**Success Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Classic Margherita Pizza",
      "description": "Authentic Italian pizza",
      "servings": 4,
      "prep_time": 30,
      "cook_time": 15,
      "image_url": "https://storage.supabase.co/...",
      "published_at": "2025-10-25T10:00:00Z",
      "author": {
        "username": "johndoe",
        "display_name": "John Doe",
        "avatar_url": "https://storage.supabase.co/..."
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "total_pages": 8
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invalid query parameters

**Authorization:**
- Accessible by authenticated and anonymous users
- Only returns recipes where `is_public = true`

---

### 2.5 Recipe Scaling

#### Scale Recipe

**Method:** `POST`  
**Path:** `/api/recipes/:id/scale`  
**Description:** Calculate scaled ingredient quantities for desired servings  
**Authentication:** Required for private recipes, optional for public recipes

**Request Body:**
```json
{
  "desired_servings": 8
}
```

**Success Response:** `200 OK`
```json
{
  "original_servings": 4,
  "desired_servings": 8,
  "scaling_factor": 2.0,
  "scaled_ingredients": [
    {
      "ingredient": {
        "name": "pizza dough",
        "display_name": "Pizza Dough"
      },
      "original_quantity": 1,
      "scaled_quantity": 2,
      "quantity_display": "2",
      "unit": "ball",
      "notes": null
    },
    {
      "ingredient": {
        "name": "fresh basil",
        "display_name": "Fresh Basil"
      },
      "original_quantity": 0,
      "scaled_quantity": 0,
      "quantity_display": "to taste",
      "unit": "leaves",
      "notes": "*Not scaled - adjust to taste"
    }
  ]
}
```

**Error Responses:**
- `400 Bad Request` - Invalid desired_servings (must be > 0)
- `401 Unauthorized` - Not authenticated (for private recipes)
- `403 Forbidden` - User does not own this private recipe
- `404 Not Found` - Recipe not found

**Validation:**
- desired_servings: required, must be > 0

**Business Logic:**
- Calculate `scaling_factor = desired_servings / original_servings`
- For each ingredient:
  - If `quantity_display` exists (text quantity): return original with note "*Not scaled"
  - If quantity is numeric: multiply by `scaling_factor`
  - Round to 2 decimal places
  - Convert decimals to fractions for common measurements (0.5 → ½, 0.33 → ⅓, etc.)

---

### 2.6 Shopping Lists

#### Get Shopping List

**Method:** `GET`  
**Path:** `/api/shopping-lists`  
**Description:** Retrieve authenticated user's shopping list  
**Authentication:** Required

**Query Parameters:**
- `include_checked` (boolean, default: true) - Include checked items

**Success Response:** `200 OK`
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "created_at": "2025-10-20T10:00:00Z",
  "updated_at": "2025-10-25T10:00:00Z",
  "items": [
    {
      "id": "uuid",
      "name": "pizza dough",
      "quantity": 2,
      "unit": "ball",
      "category": "pantry",
      "is_checked": false,
      "source_recipe_id": "uuid",
      "created_at": "2025-10-25T10:00:00Z"
    },
    {
      "id": "uuid",
      "name": "tomato sauce",
      "quantity": 1,
      "unit": "cup",
      "category": "pantry",
      "is_checked": true,
      "source_recipe_id": "uuid",
      "created_at": "2025-10-25T10:00:00Z"
    }
  ],
  "grouped_by_category": {
    "pantry": [
      { "id": "uuid", "name": "pizza dough", "quantity": 2, "unit": "ball", "is_checked": false }
    ],
    "produce": [
      { "id": "uuid", "name": "fresh basil", "quantity": 1, "unit": "bunch", "is_checked": false }
    ]
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Shopping list not found (auto-created on first access)

**Business Logic:**
- Shopping list is auto-created on first access
- Items are grouped by category for UI convenience
- Can filter out checked items with query parameter

---

#### Generate Shopping List from Recipes

**Method:** `POST`  
**Path:** `/api/shopping-lists/generate`  
**Description:** Generate/update shopping list from selected recipes  
**Authentication:** Required

**Request Body:**
```json
{
  "recipe_ids": ["uuid1", "uuid2", "uuid3"],
  "replace_existing": false
}
```

**Success Response:** `201 Created`
```json
{
  "id": "uuid",
  "items_added": 12,
  "items_updated": 3,
  "items": [
    {
      "id": "uuid",
      "name": "pizza dough",
      "quantity": 3,
      "unit": "ball",
      "category": "pantry",
      "source_recipe_id": "uuid1",
      "is_checked": false
    }
  ]
}
```

**Error Responses:**
- `400 Bad Request` - Invalid recipe_ids or validation failed
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - User does not own one or more recipes
- `404 Not Found` - One or more recipes not found

**Validation:**
- recipe_ids: required, must be array of valid UUIDs
- User must own all specified recipes

**Business Logic:**
- Fetch all ingredients from specified recipes
- Group by `(ingredient.name, unit)`
- Sum quantities for matching groups:
  - Example: Recipe A (2 cups flour) + Recipe B (1 cup flour) = 3 cups flour
- Keep separate entries for different units:
  - Example: 2 cups milk + 200ml milk → two separate items
- Text quantities (`quantity_display` exists) are listed separately per recipe
- If `replace_existing = true`: clear existing items before adding
- If `replace_existing = false`: add to existing items, update quantities for duplicates
- Preserve `category` from `ingredients` table for grouping
- Set `source_recipe_id` for traceability

---

#### Add Manual Item to Shopping List

**Method:** `POST`  
**Path:** `/api/shopping-lists/items`  
**Description:** Manually add an item to shopping list  
**Authentication:** Required

**Request Body:**
```json
{
  "name": "olive oil",
  "quantity": 2,
  "unit": "bottles",
  "category": "pantry"
}
```

**Success Response:** `201 Created`
```json
{
  "id": "uuid",
  "shopping_list_id": "uuid",
  "name": "olive oil",
  "quantity": 2,
  "unit": "bottles",
  "category": "pantry",
  "is_checked": false,
  "source_recipe_id": null,
  "created_at": "2025-10-25T12:00:00Z"
}
```

**Error Responses:**
- `400 Bad Request` - Validation failed
- `401 Unauthorized` - Not authenticated

**Validation:**
- name: required, cannot be empty after trimming
- quantity: required, must be > 0
- unit: required
- category: optional

---

#### Update Shopping List Item

**Method:** `PATCH`  
**Path:** `/api/shopping-lists/items/:id`  
**Description:** Update shopping list item (check/uncheck, modify quantity)  
**Authentication:** Required

**Request Body:**
```json
{
  "quantity": 3,
  "is_checked": true
}
```

**Success Response:** `200 OK`
```json
{
  "id": "uuid",
  "name": "olive oil",
  "quantity": 3,
  "unit": "bottles",
  "is_checked": true,
  "updated_at": "2025-10-25T12:00:00Z"
}
```

**Error Responses:**
- `400 Bad Request` - Validation failed
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Item does not belong to user's shopping list
- `404 Not Found` - Item not found

**Validation:**
- quantity: optional, must be > 0 if provided
- is_checked: optional, boolean

---

#### Delete Shopping List Item

**Method:** `DELETE`  
**Path:** `/api/shopping-lists/items/:id`  
**Description:** Remove item from shopping list  
**Authentication:** Required

**Success Response:** `200 OK`
```json
{
  "message": "Item deleted successfully",
  "id": "uuid"
}
```

**Error Responses:**
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Item does not belong to user's shopping list
- `404 Not Found` - Item not found

---

#### Clear Checked Items

**Method:** `DELETE`  
**Path:** `/api/shopping-lists/items/checked`  
**Description:** Remove all checked items from shopping list  
**Authentication:** Required

**Success Response:** `200 OK`
```json
{
  "message": "Checked items cleared successfully",
  "items_deleted": 5
}
```

**Error Responses:**
- `401 Unauthorized` - Not authenticated

---

## 3. Authentication and Authorization

### 3.1 Authentication Mechanism

**Provider:** Supabase Auth

**Method:** JWT (JSON Web Tokens)

**Implementation:**
- Client-side: Supabase JavaScript client handles authentication
- Server-side: Astro middleware validates JWT tokens from `Authorization` header

**Token Format:**
```
Authorization: Bearer <jwt_token>
```

**Token Lifecycle:**
- Access tokens expire after 1 hour
- Refresh tokens used to obtain new access tokens
- Supabase SDK handles token refresh automatically

### 3.2 Middleware Authentication

**File:** `src/middleware/index.ts`

**Implementation:**
```typescript
import { defineMiddleware } from 'astro:middleware';
import { supabaseClient } from '../db/supabase.client';

export const onRequest = defineMiddleware(async (context, next) => {
  // Attach Supabase client to context
  context.locals.supabase = supabaseClient;
  
  // Get session from request
  const authHeader = context.request.headers.get('Authorization');
  
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabaseClient.auth.getUser(token);
    
    if (user && !error) {
      context.locals.user = user;
    }
  }
  
  return next();
});
```

### 3.3 Route Protection

**Protected Routes:** All routes except public feed and authentication endpoints

**Implementation Pattern:**
```typescript
// In Astro API route
export async function GET({ locals }) {
  const { user } = locals;
  
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Proceed with authenticated request
}
```

### 3.4 Row Level Security (RLS)

**Database Level:** Supabase RLS policies enforce data access

**Policy Examples:**

**Recipes:**
- Users can SELECT/INSERT/UPDATE/DELETE their own recipes
- Anyone can SELECT public recipes (is_public = true)

**Profiles:**
- Users can SELECT/UPDATE their own profile
- Anyone can SELECT profiles of users with public recipes

**Shopping Lists:**
- Users can SELECT/INSERT/UPDATE/DELETE their own shopping list and items

**Authorization Flow:**
1. Client sends JWT token in Authorization header
2. Astro middleware validates token and extracts user
3. Supabase client uses JWT for database queries
4. RLS policies enforce access control at database level
5. Unauthorized access returns 403 Forbidden

### 3.5 CORS Configuration

**Allowed Origins:** Configure based on deployment environment

**Development:**
```
Access-Control-Allow-Origin: http://localhost:4321
```

**Production:**
```
Access-Control-Allow-Origin: https://omnomnom.app
```

**Allowed Methods:** GET, POST, PUT, PATCH, DELETE, OPTIONS

**Allowed Headers:** Authorization, Content-Type

---

## 4. Validation and Business Logic

### 4.1 Validation Rules

#### Profiles

| Field | Rule | Error Message |
|-------|------|---------------|
| username | 3-20 characters, alphanumeric | "Username must be 3-20 alphanumeric characters" |
| bio | Max 500 characters | "Bio cannot exceed 500 characters" |

#### Recipes

| Field | Rule | Error Message |
|-------|------|---------------|
| title | Required, 1-200 characters | "Title is required and must be 1-200 characters" |
| description | Optional, max 5000 characters | "Description cannot exceed 5000 characters" |
| instructions | Required, non-empty | "Instructions are required" |
| servings | Required, must be > 0 | "Servings must be greater than 0" |
| prep_time | Optional, must be >= 0 | "Prep time must be 0 or greater" |
| cook_time | Optional, must be >= 0 | "Cook time must be 0 or greater" |

#### Ingredients

| Field | Rule | Error Message |
|-------|------|---------------|
| ingredient_name | Required, non-empty | "Ingredient name is required" |
| quantity | Required (if no quantity_display), must be > 0 | "Quantity must be greater than 0" |
| unit | Required | "Unit is required" |
| order_index | Required, must be >= 0 | "Order index must be 0 or greater" |

#### Shopping List Items

| Field | Rule | Error Message |
|-------|------|---------------|
| name | Required, non-empty after trim | "Item name is required" |
| quantity | Required, must be > 0 | "Quantity must be greater than 0" |
| unit | Required | "Unit is required" |

### 4.2 Business Logic Implementation

#### Recipe Scaling Logic

**Location:** `/api/recipes/:id/scale`

**Algorithm:**
```typescript
function scaleRecipe(recipe, desiredServings) {
  const scalingFactor = desiredServings / recipe.servings;
  
  const scaledIngredients = recipe.ingredients.map(ingredient => {
    // Text-based quantities not scaled
    if (ingredient.quantity_display) {
      return {
        ...ingredient,
        scaled_quantity: ingredient.quantity,
        quantity_display: ingredient.quantity_display,
        notes: "*Not scaled - adjust to taste"
      };
    }
    
    // Numeric quantities scaled
    const scaledQuantity = ingredient.quantity * scalingFactor;
    const roundedQuantity = roundToCommonFraction(scaledQuantity);
    
    return {
      ...ingredient,
      original_quantity: ingredient.quantity,
      scaled_quantity: scaledQuantity,
      quantity_display: formatQuantity(roundedQuantity),
      unit: ingredient.unit
    };
  });
  
  return {
    original_servings: recipe.servings,
    desired_servings: desiredServings,
    scaling_factor: scalingFactor,
    scaled_ingredients: scaledIngredients
  };
}

function roundToCommonFraction(value) {
  // Round to 2 decimal places
  const rounded = Math.round(value * 100) / 100;
  
  // Convert to common fractions for display
  const fractions = {
    0.25: "¼",
    0.33: "⅓",
    0.5: "½",
    0.67: "⅔",
    0.75: "¾"
  };
  
  const decimal = rounded % 1;
  const whole = Math.floor(rounded);
  
  if (fractions[decimal.toFixed(2)]) {
    return whole > 0 ? `${whole} ${fractions[decimal.toFixed(2)]}` : fractions[decimal.toFixed(2)];
  }
  
  return rounded.toString();
}
```

#### Shopping List Aggregation Logic

**Location:** `/api/shopping-lists/generate`

**Algorithm:**
```typescript
function aggregateIngredients(recipeIds, userRecipes) {
  const ingredientMap = new Map();
  
  for (const recipeId of recipeIds) {
    const recipe = userRecipes.find(r => r.id === recipeId);
    
    for (const recipeIngredient of recipe.ingredients) {
      // Text quantities listed separately
      if (recipeIngredient.quantity_display) {
        const textKey = `${recipeIngredient.ingredient.name}-${recipeId}`;
        ingredientMap.set(textKey, {
          name: recipeIngredient.ingredient.display_name,
          quantity_display: recipeIngredient.quantity_display,
          unit: recipeIngredient.unit,
          category: recipeIngredient.ingredient.category,
          source_recipe_id: recipeId
        });
        continue;
      }
      
      // Numeric quantities aggregated by name + unit
      const key = `${recipeIngredient.ingredient.name}-${recipeIngredient.unit}`;
      
      if (ingredientMap.has(key)) {
        const existing = ingredientMap.get(key);
        existing.quantity += recipeIngredient.quantity;
      } else {
        ingredientMap.set(key, {
          name: recipeIngredient.ingredient.display_name,
          quantity: recipeIngredient.quantity,
          unit: recipeIngredient.unit,
          category: recipeIngredient.ingredient.category,
          source_recipe_id: recipeId
        });
      }
    }
  }
  
  return Array.from(ingredientMap.values());
}
```

#### Recipe Publication Logic

**Location:** `/api/recipes/:id/visibility`

**Business Rules:**
- First publication sets `published_at` timestamp
- Unpublishing sets `unpublished_at` timestamp
- Database trigger handles timestamp updates automatically

**Implementation:**
```typescript
async function toggleRecipeVisibility(recipeId, isPublic, supabase, userId) {
  // Verify ownership via RLS
  const { data: recipe, error } = await supabase
    .from('recipes')
    .update({ is_public: isPublic })
    .eq('id', recipeId)
    .eq('user_id', userId)
    .select()
    .single();
  
  if (error) {
    throw new Error('Failed to update recipe visibility');
  }
  
  // Database trigger handles published_at and unpublished_at automatically
  return recipe;
}
```

### 4.3 Error Handling

**Standard Error Response Format:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Title is required and must be 1-200 characters",
    "field": "title",
    "details": {}
  }
}
```

**Error Codes:**
- `VALIDATION_ERROR` - Input validation failed
- `AUTHENTICATION_ERROR` - User not authenticated
- `AUTHORIZATION_ERROR` - User not authorized for this resource
- `NOT_FOUND` - Resource not found
- `CONFLICT` - Resource conflict (e.g., duplicate username)
- `INTERNAL_ERROR` - Server error

### 4.4 Rate Limiting

**Strategy:** Token bucket algorithm

**Limits:**
- Authenticated users: 100 requests/minute
- Anonymous users (public feed): 20 requests/minute

**Implementation:** Middleware-based rate limiting

**Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1635724800
```

**Response when exceeded:**
```
429 Too Many Requests
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "retry_after": 60
  }
}
```

---

## 5. Performance Considerations

### 5.1 Pagination

**Default Page Size:** 20 items  
**Maximum Page Size:** 100 items

**Implementation:**
- Offset-based pagination for simplicity
- Cursor-based pagination recommended for large datasets (future enhancement)

### 5.2 Database Optimization

**Indexed Queries:**
- Public feed: Uses `idx_recipes_is_public_created` composite index
- User recipes: Uses `idx_recipes_user_created` composite index
- Shopping list items: Uses `idx_shopping_list_items_list_id` index

**Query Optimization:**
- Select only required fields
- Use JOIN for related data (ingredients, author info)
- Leverage partial indexes for filtered queries

### 5.3 Caching Strategy

**Public Feed:**
- Cache public recipes list for 5 minutes
- Invalidate on recipe publication/unpublication

**Static Assets:**
- Recipe images served via CDN (Supabase Storage)
- Cache headers: `max-age=31536000` (1 year)

---

## 6. API Versioning

**Current Version:** v1 (implicit)

**Future Versioning Strategy:**
- URL-based versioning: `/api/v2/recipes`
- Maintain backward compatibility for at least one major version

---

**Document Status:** Ready for Implementation  
**Last Updated:** October 25, 2025
