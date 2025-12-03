-- =====================================================================
-- Migration: Create ingredients table
-- Description: Master list of all unique ingredients (normalized)
-- Author: Database Architecture Team
-- Date: 2025-10-25
-- 
-- Tables Created:
--   - ingredients
--
-- Dependencies:
--   - None
--
-- Security:
--   - Row Level Security (RLS) enabled
--   - All authenticated users can read ingredients
--   - All authenticated users can insert new ingredients
--   - No update or delete policies (ingredients are immutable in MVP)
--
-- Notes:
--   - Ingredients are normalized with lowercase names to prevent duplicates
--   - Display name preserves original capitalization for UI
--   - Category field supports future shopping list grouping
-- =====================================================================

-- create ingredients table
-- master list of all unique ingredients used across all recipes
create table public.ingredients (
  id uuid not null primary key default gen_random_uuid(),
  name text not null unique,
  display_name text not null,
  category text null,
  created_at timestamptz not null default now(),
  
  -- name must be lowercase and trimmed for normalization
  constraint chk_ingredient_name_format 
    check (name = lower(trim(name))),
  
  -- name cannot be empty after trimming
  constraint chk_ingredient_name_not_empty 
    check (length(trim(name)) > 0)
);

-- create indexes for performance
-- unique index on lowercase name to prevent duplicates like "Flour" and "flour"
create unique index idx_ingredients_name_lower 
  on public.ingredients(lower(trim(name)));

-- index on category for shopping list grouping queries
create index idx_ingredients_category 
  on public.ingredients(category) 
  where category is not null;

-- add comment to table
comment on table public.ingredients is 
  'Master list of all unique ingredients. Normalized with lowercase names to prevent duplicates.';

-- add comments to columns
comment on column public.ingredients.id is 
  'Unique ingredient identifier';
comment on column public.ingredients.name is 
  'Ingredient name (always lowercase and trimmed for normalization)';
comment on column public.ingredients.display_name is 
  'Display name preserving original capitalization for UI presentation';
comment on column public.ingredients.category is 
  'Ingredient category (produce, dairy, meat, pantry, spices, etc.) for shopping list grouping';

-- =====================================================================
-- row level security (rls) policies
-- =====================================================================

-- enable rls on ingredients table
alter table public.ingredients enable row level security;

-- policy: authenticated users can read all ingredients
-- allows any logged-in user to view the master ingredient list
create policy "Authenticated users can read ingredients"
  on public.ingredients
  for select
  to authenticated
  using (true);

-- policy: authenticated users can insert new ingredients
-- allows any logged-in user to add new ingredients when creating recipes
-- note: no update or delete policies for mvp to maintain data integrity
create policy "Authenticated users can add ingredients"
  on public.ingredients
  for insert
  to authenticated
  with check (true);

-- note: anonymous users cannot access ingredients table
-- ingredients are only visible to authenticated users via recipe_ingredients join
