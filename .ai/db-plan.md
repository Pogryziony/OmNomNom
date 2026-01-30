# PostgreSQL Database Schema Plan

**Project:** OmNomNom - Recipe Management Application  
**Version:** 1.0  
**Date:** October 25, 2025  
**Database:** PostgreSQL 15+ (Supabase)

---

## Schema Overview

This schema supports a recipe management application with the following core requirements:
- User authentication and profile management
- Private and public recipe storage with CRUD operations
- Recipe ingredient management with master ingredient list
- Shopping list generation from multiple recipes
- Row Level Security (RLS) for multi-tenant data isolation

---

## 1. Tables, Columns, Data Types, and Constraints

### Table: `profiles`

**Purpose:** User profile information extending Supabase auth.users

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | `PRIMARY KEY` | User ID (references auth.users.id) |
| `username` | `text` | `NOT NULL`, `UNIQUE` | Display name (3-20 chars) |
| `display_name` | `text` | `NULLABLE`, `DEFAULT username` | Full display name |
| `bio` | `text` | `NULLABLE` | User bio (max 500 chars) |
| `avatar_url` | `text` | `NULLABLE` | Profile picture URL |
| `created_at` | `timestamptz` | `NOT NULL`, `DEFAULT now()` | Account creation timestamp |
| `updated_at` | `timestamptz` | `NOT NULL`, `DEFAULT now()` | Last update timestamp |

**Constraints:**
```sql
CONSTRAINT fk_profiles_user FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
CONSTRAINT chk_username_length CHECK (length(username) BETWEEN 3 AND 20)
CONSTRAINT chk_bio_length CHECK (length(bio) <= 500)
```

---

### Table: `ingredients`

**Purpose:** Master list of all unique ingredients (normalized)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | Unique ingredient ID |
| `name` | `text` | `NOT NULL`, `UNIQUE` | Ingredient name (lowercase, trimmed) |
| `display_name` | `text` | `NOT NULL` | Display name (preserves capitalization) |
| `category` | `text` | `NULLABLE` | Category (produce, dairy, meat, pantry, spices, etc.) |
| `created_at` | `timestamptz` | `NOT NULL`, `DEFAULT now()` | Creation timestamp |

**Constraints:**
```sql
CONSTRAINT chk_ingredient_name_format CHECK (name = lower(trim(name)))
CONSTRAINT chk_ingredient_name_not_empty CHECK (length(trim(name)) > 0)
```

---

### Table: `recipes`

**Purpose:** User recipes (private and public)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | Unique recipe ID |
| `user_id` | `uuid` | `NOT NULL` | Recipe owner (references auth.users.id) |
| `title` | `text` | `NOT NULL` | Recipe title (max 200 chars) |
| `description` | `text` | `NULLABLE` | Recipe description (max 5000 chars) |
| `instructions` | `text` | `NOT NULL` | Cooking instructions |
| `servings` | `integer` | `NOT NULL`, `DEFAULT 4` | Number of servings |
| `prep_time` | `integer` | `NULLABLE` | Prep time in minutes |
| `cook_time` | `integer` | `NULLABLE` | Cook time in minutes |
| `image_url` | `text` | `NULLABLE` | Recipe image URL (Supabase Storage) |
| `is_public` | `boolean` | `NOT NULL`, `DEFAULT false` | Public visibility flag |
| `published_at` | `timestamptz` | `NULLABLE` | First publication timestamp |
| `unpublished_at` | `timestamptz` | `NULLABLE` | Last unpublish timestamp |
| `created_at` | `timestamptz` | `NOT NULL`, `DEFAULT now()` | Recipe creation timestamp |
| `updated_at` | `timestamptz` | `NOT NULL`, `DEFAULT now()` | Last update timestamp |

**Constraints:**
```sql
CONSTRAINT fk_recipes_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
CONSTRAINT chk_recipe_title_length CHECK (length(title) <= 200 AND length(title) > 0)
CONSTRAINT chk_recipe_description_length CHECK (length(description) <= 5000)
CONSTRAINT chk_recipe_servings_positive CHECK (servings > 0)
CONSTRAINT chk_recipe_prep_time_nonnegative CHECK (prep_time IS NULL OR prep_time >= 0)
CONSTRAINT chk_recipe_cook_time_nonnegative CHECK (cook_time IS NULL OR cook_time >= 0)
```

---

### Table: `recipe_ingredients`

**Purpose:** Junction table linking recipes to ingredients with quantities

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | Unique identifier |
| `recipe_id` | `uuid` | `NOT NULL` | Recipe reference |
| `ingredient_id` | `uuid` | `NOT NULL` | Ingredient reference |
| `quantity` | `numeric(10,2)` | `NOT NULL` | Ingredient amount |
| `quantity_display` | `text` | `NULLABLE` | Optional display override (e.g., "a pinch") |
| `unit` | `text` | `NOT NULL` | Measurement unit (cup, g, ml, tbsp, tsp, etc.) |
| `order_index` | `integer` | `NOT NULL`, `DEFAULT 0` | Display order in recipe |
| `notes` | `text` | `NULLABLE` | Special notes ("optional", "to taste") |

**Constraints:**
```sql
CONSTRAINT fk_recipe_ingredients_recipe FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
CONSTRAINT fk_recipe_ingredients_ingredient FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE RESTRICT
CONSTRAINT chk_quantity_positive CHECK (quantity > 0)
CONSTRAINT chk_order_index_nonnegative CHECK (order_index >= 0)
```

---

### Table: `shopping_lists`

**Purpose:** One shopping list per user

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | Shopping list ID |
| `user_id` | `uuid` | `NOT NULL`, `UNIQUE` | List owner (one per user) |
| `created_at` | `timestamptz` | `NOT NULL`, `DEFAULT now()` | List creation timestamp |
| `updated_at` | `timestamptz` | `NOT NULL`, `DEFAULT now()` | Last update timestamp |

**Constraints:**
```sql
CONSTRAINT fk_shopping_lists_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
```

---

### Table: `shopping_list_items`

**Purpose:** Items in user's shopping list

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | Item ID |
| `shopping_list_id` | `uuid` | `NOT NULL` | Parent shopping list |
| `source_recipe_id` | `uuid` | `NULLABLE` | Source recipe (for traceability) |
| `name` | `text` | `NOT NULL` | Item name |
| `quantity` | `numeric(10,2)` | `NOT NULL` | Item quantity |
| `unit` | `text` | `NOT NULL` | Measurement unit |
| `category` | `text` | `NULLABLE` | Item category for grouping |
| `is_checked` | `boolean` | `NOT NULL`, `DEFAULT false` | Purchased status |
| `created_at` | `timestamptz` | `NOT NULL`, `DEFAULT now()` | Item added timestamp |

**Constraints:**
```sql
CONSTRAINT fk_shopping_list_items_list FOREIGN KEY (shopping_list_id) REFERENCES shopping_lists(id) ON DELETE CASCADE
CONSTRAINT fk_shopping_list_items_recipe FOREIGN KEY (source_recipe_id) REFERENCES recipes(id) ON DELETE SET NULL
CONSTRAINT chk_shopping_item_quantity_positive CHECK (quantity > 0)
CONSTRAINT chk_shopping_item_name_not_empty CHECK (length(trim(name)) > 0)
```

---

## 2. Relationships Between Tables

### Entity Relationship Diagram (ERD)

```
auth.users (Supabase Auth)
    ↓ (1:1)
profiles
    ↓ (1:many)
recipes ← (many:many via recipe_ingredients) → ingredients
    ↓ (1:many)
recipe_ingredients

auth.users
    ↓ (1:1)
shopping_lists
    ↓ (1:many)
shopping_list_items → (many:1 optional) → recipes
```

### Relationship Details

1. **auth.users ↔ profiles** (One-to-One)
   - One user has one profile
   - CASCADE on delete (deleting user removes profile)

2. **profiles ↔ recipes** (One-to-Many)
   - One user creates many recipes
   - CASCADE on delete (deleting user removes their recipes)

3. **recipes ↔ recipe_ingredients** (One-to-Many)
   - One recipe has many ingredients
   - CASCADE on delete (deleting recipe removes its ingredients)

4. **ingredients ↔ recipe_ingredients** (One-to-Many)
   - One ingredient used in many recipes
   - RESTRICT on delete (cannot delete ingredient if in use)

5. **auth.users ↔ shopping_lists** (One-to-One)
   - One user has one shopping list
   - UNIQUE constraint enforces single list per user
   - CASCADE on delete (deleting user removes their shopping list)

6. **shopping_lists ↔ shopping_list_items** (One-to-Many)
   - One shopping list contains many items
   - CASCADE on delete (deleting list removes all items)

7. **recipes ↔ shopping_list_items** (One-to-Many, Optional)
   - One recipe can source many shopping list items
   - SET NULL on delete (deleting recipe preserves shopping list items)

---

## 3. Indexes

### Performance Optimization Indexes

```sql
-- Profiles
CREATE UNIQUE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_created_at ON profiles(created_at DESC);

-- Ingredients
CREATE UNIQUE INDEX idx_ingredients_name_lower ON ingredients(lower(trim(name)));
CREATE INDEX idx_ingredients_category ON ingredients(category);

-- Recipes
CREATE INDEX idx_recipes_user_id ON recipes(user_id);
CREATE INDEX idx_recipes_is_public_created ON recipes(is_public, created_at DESC) WHERE is_public = true;
CREATE INDEX idx_recipes_user_created ON recipes(user_id, created_at DESC);
CREATE INDEX idx_recipes_published_at ON recipes(published_at DESC) WHERE published_at IS NOT NULL;

-- Recipe Ingredients
CREATE INDEX idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_ingredients_ingredient_id ON recipe_ingredients(ingredient_id);
CREATE INDEX idx_recipe_ingredients_order ON recipe_ingredients(recipe_id, order_index);

-- Shopping Lists
CREATE UNIQUE INDEX idx_shopping_lists_user_id ON shopping_lists(user_id);

-- Shopping List Items
CREATE INDEX idx_shopping_list_items_list_id ON shopping_list_items(shopping_list_id);
CREATE INDEX idx_shopping_list_items_category ON shopping_list_items(category);
CREATE INDEX idx_shopping_list_items_checked ON shopping_list_items(shopping_list_id, is_checked);
```

### Index Rationale

- **`idx_recipes_is_public_created`**: Optimizes public feed query (chronological ordering with pagination)
- **`idx_recipes_user_created`**: Optimizes user's private recipe dashboard
- **`idx_recipe_ingredients_recipe_id`**: Speeds up ingredient lookups for recipe detail pages
- **`idx_shopping_list_items_checked`**: Optimizes "clear checked items" operation
- **`idx_ingredients_name_lower`**: Prevents duplicate ingredients with different capitalization

---

## 4. Row Level Security (RLS) Policies

### Enable RLS on All Tables

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_list_items ENABLE ROW LEVEL SECURITY;
```

---

### Policies: `profiles`

**Policy 1: Users can view their own profile**
```sql
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);
```

**Policy 2: Users can update their own profile**
```sql
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);
```

**Policy 3: Public profiles visible for recipe authors**
```sql
CREATE POLICY "Public profiles visible for public recipes"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM recipes
      WHERE recipes.user_id = profiles.id
      AND recipes.is_public = true
    )
  );
```

---

### Policies: `recipes`

**Policy 1: Users can manage their own recipes**
```sql
CREATE POLICY "Users can manage own recipes"
  ON recipes FOR ALL
  USING (auth.uid() = user_id);
```

**Policy 2: Anyone can read public recipes**
```sql
CREATE POLICY "Public recipes are readable by all"
  ON recipes FOR SELECT
  USING (is_public = true);
```

---

### Policies: `ingredients`

**Policy 1: Anyone (authenticated) can read ingredients**
```sql
CREATE POLICY "Authenticated users can read ingredients"
  ON ingredients FOR SELECT
  TO authenticated
  USING (true);
```

**Policy 2: Authenticated users can insert ingredients**
```sql
CREATE POLICY "Authenticated users can add ingredients"
  ON ingredients FOR INSERT
  TO authenticated
  WITH CHECK (true);
```

**Note:** No UPDATE or DELETE policies for MVP. Ingredients are immutable once created to maintain data integrity across recipes.

---

### Policies: `recipe_ingredients`

**Policy 1: Users can manage ingredients for their own recipes**
```sql
CREATE POLICY "Users can manage own recipe ingredients"
  ON recipe_ingredients FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM recipes
      WHERE recipes.id = recipe_ingredients.recipe_id
      AND recipes.user_id = auth.uid()
    )
  );
```

**Policy 2: Anyone can read ingredients of public recipes**
```sql
CREATE POLICY "Public recipe ingredients are readable"
  ON recipe_ingredients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM recipes
      WHERE recipes.id = recipe_ingredients.recipe_id
      AND recipes.is_public = true
    )
  );
```

---

### Policies: `shopping_lists`

**Policy 1: Users can manage their own shopping list**
```sql
CREATE POLICY "Users can manage own shopping list"
  ON shopping_lists FOR ALL
  USING (auth.uid() = user_id);
```

---

### Policies: `shopping_list_items`

**Policy 1: Users can manage items in their own shopping list**
```sql
CREATE POLICY "Users can manage own shopping list items"
  ON shopping_list_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM shopping_lists
      WHERE shopping_lists.id = shopping_list_items.shopping_list_id
      AND shopping_lists.user_id = auth.uid()
    )
  );
```

---

## 5. Database Functions & Triggers

### Function: Auto-create profile on user signup

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

---

### Function: Track recipe publication timestamps

```sql
CREATE OR REPLACE FUNCTION public.handle_recipe_publish()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If changing from private to public
  IF NEW.is_public = true AND (OLD.is_public = false OR OLD.is_public IS NULL) THEN
    NEW.published_at = NOW();
  END IF;
  
  -- If changing from public to private
  IF NEW.is_public = false AND OLD.is_public = true THEN
    NEW.unpublished_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_recipe_publish_status_change
  BEFORE UPDATE OF is_public ON recipes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_recipe_publish();
```

---

### Function: Update `updated_at` timestamp

```sql
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Apply to relevant tables
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON recipes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON shopping_lists
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
```

---

## 6. Design Decisions & Notes

### Normalization Strategy

- **3NF (Third Normal Form)**: Schema is normalized to reduce redundancy
- **`ingredients` table**: Master list prevents duplicate ingredient entries
- **Junction table pattern**: `recipe_ingredients` implements many-to-many relationship
- **Denormalization for shopping lists**: Items are copied (not referenced) to allow recipe deletion without affecting shopping lists

### Data Type Choices

- **`numeric(10,2)` for quantities**: Provides decimal precision for scaling calculations while maintaining mathematical accuracy
- **`text` for instructions**: No artificial length limit; PostgreSQL handles variable-length text efficiently
- **`timestamptz`**: Timezone-aware timestamps for international users
- **`uuid` for primary keys**: Prevents ID enumeration attacks, globally unique, works well with distributed systems

### Security Considerations

- **Row Level Security (RLS)**: All tables protected with RLS policies
- **Policy-based access control**: Security enforced at database level, not application layer
- **CASCADE vs RESTRICT**: 
  - CASCADE for user-owned data (recipes, shopping lists) to prevent orphaned records
  - RESTRICT for shared data (ingredients) to maintain referential integrity
  - SET NULL for optional relationships (shopping_list_items.source_recipe_id)

### Performance Optimizations

- **Partial indexes**: `WHERE is_public = true` reduces index size for public feed queries
- **Composite indexes**: `(user_id, created_at DESC)` supports common query patterns
- **Index on `order_index`**: Maintains ingredient display order efficiently

### Scalability Considerations

- **Ingredient deduplication**: Lowercase normalization prevents duplicate entries while preserving display names
- **Shopping list aggregation**: Computed at query time (not stored) to handle recipe updates
- **Image storage**: URLs only (not blobs) keep database size manageable
- **No soft deletes in MVP**: Hard deletes simplify schema; can add `deleted_at` column post-MVP

### Future Extension Points

- **`profiles.bio`**: Supports future user profile pages
- **`recipes.published_at/unpublished_at`**: Analytics and publication history tracking
- **`shopping_list_items.source_recipe_id`**: Enables "show source recipe" feature post-MVP
- **`ingredients.category`**: Foundation for categorized shopping lists

### Migration Strategy

1. Create tables in dependency order: `profiles` → `ingredients` → `recipes` → `recipe_ingredients` → `shopping_lists` → `shopping_list_items`
2. Create indexes after data insertion (faster than concurrent index creation)
3. Enable RLS and create policies before allowing user access
4. Test RLS policies with multiple user accounts before production deployment

---

**Schema Version:** 1.0  
**Last Updated:** October 25, 2025  
**Status:** Ready for Implementation
