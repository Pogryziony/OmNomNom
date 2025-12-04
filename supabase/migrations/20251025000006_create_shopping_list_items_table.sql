-- =====================================================================
-- Migration: Create shopping_list_items table
-- Description: Items in user's shopping list
-- Author: Database Architecture Team
-- Date: 2025-10-25
-- 
-- Tables Created:
--   - shopping_list_items
--
-- Dependencies:
--   - public.shopping_lists
--   - public.recipes (optional foreign key)
--
-- Security:
--   - Row Level Security (RLS) enabled
--   - Users can only manage items in their own shopping list
--
-- Notes:
--   - Many-to-one relationship with shopping_lists
--   - Optional source_recipe_id for traceability
--   - Items persist even if source recipe is deleted (SET NULL)
--   - Supports manual item addition (not just from recipes)
--   - Category field enables grouped display
-- =====================================================================

-- create shopping_list_items table
-- individual items in a user's shopping list
create table public.shopping_list_items (
  id uuid not null primary key default gen_random_uuid(),
  shopping_list_id uuid not null,
  source_recipe_id uuid null,
  name text not null,
  quantity numeric(10,2) not null,
  unit text not null,
  category text null,
  is_checked boolean not null default false,
  created_at timestamptz not null default now(),
  
  -- foreign key to shopping_lists (cascade delete)
  constraint fk_shopping_list_items_list 
    foreign key (shopping_list_id) 
    references public.shopping_lists(id) 
    on delete cascade,
  
  -- optional foreign key to recipes (set null on delete)
  -- allows items to persist even if source recipe is deleted
  constraint fk_shopping_list_items_recipe 
    foreign key (source_recipe_id) 
    references public.recipes(id) 
    on delete set null,
  
  -- quantity must be positive
  constraint chk_shopping_item_quantity_positive 
    check (quantity > 0),
  
  -- name cannot be empty after trimming
  constraint chk_shopping_item_name_not_empty 
    check (length(trim(name)) > 0)
);

-- create indexes for performance
-- index on shopping_list_id for retrieving all items in a list
create index idx_shopping_list_items_list_id 
  on public.shopping_list_items(shopping_list_id);

-- index on category for grouped display queries
create index idx_shopping_list_items_category 
  on public.shopping_list_items(category) 
  where category is not null;

-- composite index for filtering checked/unchecked items
create index idx_shopping_list_items_checked 
  on public.shopping_list_items(shopping_list_id, is_checked);

-- add comment to table
comment on table public.shopping_list_items is 
  'Individual items in a user''s shopping list. Items can be generated from recipes or manually added.';

-- add comments to columns
comment on column public.shopping_list_items.id is 
  'Unique item identifier';
comment on column public.shopping_list_items.shopping_list_id is 
  'Reference to parent shopping list';
comment on column public.shopping_list_items.source_recipe_id is 
  'Optional reference to source recipe (for traceability). Null for manually added items.';
comment on column public.shopping_list_items.name is 
  'Item name (ingredient name)';
comment on column public.shopping_list_items.quantity is 
  'Item quantity (aggregated if from multiple recipes)';
comment on column public.shopping_list_items.unit is 
  'Measurement unit (cup, g, ml, etc.)';
comment on column public.shopping_list_items.category is 
  'Item category for grouped display (produce, dairy, meat, pantry, spices, etc.)';
comment on column public.shopping_list_items.is_checked is 
  'Purchased status (true = item purchased, false = still needed)';

-- =====================================================================
-- row level security (rls) policies
-- =====================================================================

-- enable rls on shopping_list_items table
alter table public.shopping_list_items enable row level security;

-- policy: users can select items in their own shopping list
-- allows authenticated users to view items in their shopping list
create policy "Users can select own shopping list items"
  on public.shopping_list_items
  for select
  to authenticated
  using (
    exists (
      select 1 
      from public.shopping_lists
      where shopping_lists.id = shopping_list_items.shopping_list_id
        and shopping_lists.user_id = auth.uid()
    )
  );

-- policy: users can insert items into their own shopping list
-- allows authenticated users to add items to their shopping list
create policy "Users can insert own shopping list items"
  on public.shopping_list_items
  for insert
  to authenticated
  with check (
    exists (
      select 1 
      from public.shopping_lists
      where shopping_lists.id = shopping_list_items.shopping_list_id
        and shopping_lists.user_id = auth.uid()
    )
  );

-- policy: users can update items in their own shopping list
-- allows authenticated users to edit items in their shopping list
-- (e.g., check/uncheck items, update quantities)
create policy "Users can update own shopping list items"
  on public.shopping_list_items
  for update
  to authenticated
  using (
    exists (
      select 1 
      from public.shopping_lists
      where shopping_lists.id = shopping_list_items.shopping_list_id
        and shopping_lists.user_id = auth.uid()
    )
  );

-- policy: users can delete items from their own shopping list
-- allows authenticated users to remove items from their shopping list
create policy "Users can delete own shopping list items"
  on public.shopping_list_items
  for delete
  to authenticated
  using (
    exists (
      select 1 
      from public.shopping_lists
      where shopping_lists.id = shopping_list_items.shopping_list_id
        and shopping_lists.user_id = auth.uid()
    )
  );
