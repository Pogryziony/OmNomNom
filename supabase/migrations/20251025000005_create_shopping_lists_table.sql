-- =====================================================================
-- Migration: Create shopping_lists table
-- Description: One shopping list per user
-- Author: Database Architecture Team
-- Date: 2025-10-25
-- 
-- Tables Created:
--   - shopping_lists
--
-- Dependencies:
--   - auth.users (Supabase Auth)
--
-- Security:
--   - Row Level Security (RLS) enabled
--   - Users can only manage their own shopping list
--
-- Notes:
--   - One-to-one relationship with users (enforced by UNIQUE constraint)
--   - Shopping list persists between sessions
--   - Auto-created on first use (application logic)
-- =====================================================================

-- create shopping_lists table
-- each user has exactly one shopping list
create table public.shopping_lists (
  id uuid not null primary key default gen_random_uuid(),
  user_id uuid not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- foreign key to auth.users (cascade delete)
  constraint fk_shopping_lists_user 
    foreign key (user_id) 
    references auth.users(id) 
    on delete cascade
);

-- create indexes for performance
-- unique index on user_id enforces one list per user
create unique index idx_shopping_lists_user_id 
  on public.shopping_lists(user_id);

-- add comment to table
comment on table public.shopping_lists is 
  'One shopping list per user. Persists between sessions.';

-- add comments to columns
comment on column public.shopping_lists.id is 
  'Unique shopping list identifier';
comment on column public.shopping_lists.user_id is 
  'List owner (one-to-one with users)';

-- =====================================================================
-- row level security (rls) policies
-- =====================================================================

-- enable rls on shopping_lists table
alter table public.shopping_lists enable row level security;

-- policy: users can select their own shopping list
-- allows authenticated users to view their shopping list
create policy "Users can select own shopping list"
  on public.shopping_lists
  for select
  to authenticated
  using (auth.uid() = user_id);

-- policy: users can insert their own shopping list
-- allows authenticated users to create their shopping list
create policy "Users can insert own shopping list"
  on public.shopping_lists
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- policy: users can update their own shopping list
-- allows authenticated users to update their shopping list
create policy "Users can update own shopping list"
  on public.shopping_lists
  for update
  to authenticated
  using (auth.uid() = user_id);

-- policy: users can delete their own shopping list
-- allows authenticated users to delete their shopping list
-- warning: this will cascade delete all shopping list items
create policy "Users can delete own shopping list"
  on public.shopping_lists
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- =====================================================================
-- functions and triggers
-- =====================================================================

-- trigger: update updated_at on shopping list changes
-- reuses the handle_updated_at function from profiles migration
create trigger set_updated_at
  before update on public.shopping_lists
  for each row
  execute function public.handle_updated_at();
