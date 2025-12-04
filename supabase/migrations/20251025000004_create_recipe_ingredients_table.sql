-- =====================================================================
-- Migration: Create recipe_ingredients junction table
-- Description: Links recipes to ingredients with quantities and units
-- Author: Database Architecture Team
-- Date: 2025-10-25
-- 
-- Tables Created:
--   - recipe_ingredients
--
-- Dependencies:
--   - public.recipes
--   - public.ingredients
--
-- Security:
--   - Row Level Security (RLS) enabled
--   - Users can manage ingredients for their own recipes
--   - Anyone can read ingredients of public recipes
--
-- Notes:
--   - Junction table implementing many-to-many relationship
--   - Quantities stored as numeric(10,2) for scaling precision
--   - Optional quantity_display for text-based quantities ("a pinch")
--   - order_index maintains ingredient display order
-- =====================================================================

-- create recipe_ingredients junction table
-- links recipes to ingredients with quantities, units, and display order
create table public.recipe_ingredients (
  id uuid not null primary key default gen_random_uuid(),
  recipe_id uuid not null,
  ingredient_id uuid not null,
  quantity numeric(10,2) not null,
  quantity_display text null,
  unit text not null,
  order_index integer not null default 0,
  notes text null,
  
  -- foreign key to recipes (cascade delete)
  constraint fk_recipe_ingredients_recipe 
    foreign key (recipe_id) 
    references public.recipes(id) 
    on delete cascade,
  
  -- foreign key to ingredients (restrict delete if in use)
  constraint fk_recipe_ingredients_ingredient 
    foreign key (ingredient_id) 
    references public.ingredients(id) 
    on delete restrict,
  
  -- quantity must be positive
  constraint chk_quantity_positive 
    check (quantity > 0),
  
  -- order_index must be non-negative
  constraint chk_order_index_nonnegative 
    check (order_index >= 0)
);

-- create indexes for performance
-- index on recipe_id for ingredient lookups on recipe detail page
create index idx_recipe_ingredients_recipe_id 
  on public.recipe_ingredients(recipe_id);

-- index on ingredient_id for finding recipes using a specific ingredient
create index idx_recipe_ingredients_ingredient_id 
  on public.recipe_ingredients(ingredient_id);

-- composite index for ordered ingredient display
create index idx_recipe_ingredients_order 
  on public.recipe_ingredients(recipe_id, order_index);

-- add comment to table
comment on table public.recipe_ingredients is 
  'Junction table linking recipes to ingredients with quantities, units, and display order';

-- add comments to columns
comment on column public.recipe_ingredients.id is 
  'Unique identifier for the recipe-ingredient relationship';
comment on column public.recipe_ingredients.recipe_id is 
  'Reference to the recipe';
comment on column public.recipe_ingredients.ingredient_id is 
  'Reference to the ingredient from master list';
comment on column public.recipe_ingredients.quantity is 
  'Ingredient amount (numeric for scaling calculations)';
comment on column public.recipe_ingredients.quantity_display is 
  'Optional display override for text-based quantities (e.g., "a pinch", "to taste")';
comment on column public.recipe_ingredients.unit is 
  'Measurement unit (cup, g, ml, tbsp, tsp, etc.)';
comment on column public.recipe_ingredients.order_index is 
  'Display order of ingredient in recipe (0-based)';
comment on column public.recipe_ingredients.notes is 
  'Special notes for this ingredient (e.g., "optional", "divided")';

-- =====================================================================
-- row level security (rls) policies
-- =====================================================================

-- enable rls on recipe_ingredients table
alter table public.recipe_ingredients enable row level security;

-- policy: users can select ingredients for their own recipes
-- allows authenticated users to view ingredients in their own recipes
create policy "Users can select own recipe ingredients"
  on public.recipe_ingredients
  for select
  to authenticated
  using (
    exists (
      select 1 
      from public.recipes
      where recipes.id = recipe_ingredients.recipe_id
        and recipes.user_id = auth.uid()
    )
  );

-- policy: users can insert ingredients for their own recipes
-- allows authenticated users to add ingredients when creating recipes
create policy "Users can insert own recipe ingredients"
  on public.recipe_ingredients
  for insert
  to authenticated
  with check (
    exists (
      select 1 
      from public.recipes
      where recipes.id = recipe_ingredients.recipe_id
        and recipes.user_id = auth.uid()
    )
  );

-- policy: users can update ingredients for their own recipes
-- allows authenticated users to edit ingredient quantities when updating recipes
create policy "Users can update own recipe ingredients"
  on public.recipe_ingredients
  for update
  to authenticated
  using (
    exists (
      select 1 
      from public.recipes
      where recipes.id = recipe_ingredients.recipe_id
        and recipes.user_id = auth.uid()
    )
  );

-- policy: users can delete ingredients from their own recipes
-- allows authenticated users to remove ingredients when editing recipes
create policy "Users can delete own recipe ingredients"
  on public.recipe_ingredients
  for delete
  to authenticated
  using (
    exists (
      select 1 
      from public.recipes
      where recipes.id = recipe_ingredients.recipe_id
        and recipes.user_id = auth.uid()
    )
  );

-- policy: authenticated users can read ingredients of public recipes
-- allows logged-in users to view ingredients in public recipes
create policy "Authenticated users can read public recipe ingredients"
  on public.recipe_ingredients
  for select
  to authenticated
  using (
    exists (
      select 1 
      from public.recipes
      where recipes.id = recipe_ingredients.recipe_id
        and recipes.is_public = true
    )
  );

-- policy: anonymous users can read ingredients of public recipes
-- allows guests to view ingredients in public recipes
create policy "Anonymous users can read public recipe ingredients"
  on public.recipe_ingredients
  for select
  to anon
  using (
    exists (
      select 1 
      from public.recipes
      where recipes.id = recipe_ingredients.recipe_id
        and recipes.is_public = true
    )
  );
