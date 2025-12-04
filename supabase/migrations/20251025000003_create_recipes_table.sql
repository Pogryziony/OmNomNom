-- =====================================================================
-- Migration: Create recipes table
-- Description: User recipes with privacy controls (private/public)
-- Author: Database Architecture Team
-- Date: 2025-10-25
-- 
-- Tables Created:
--   - recipes
--
-- Dependencies:
--   - auth.users (Supabase Auth)
--   - public.profiles
--
-- Security:
--   - Row Level Security (RLS) enabled
--   - Users can manage (CRUD) their own recipes
--   - Anyone can read public recipes (is_public = true)
--
-- Notes:
--   - Recipes default to private (is_public = false)
--   - Publication timestamps tracked via trigger
--   - Supports optional image upload via Supabase Storage
-- =====================================================================

-- create recipes table
-- stores all user recipes with privacy controls
create table public.recipes (
  id uuid not null primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  description text null,
  instructions text not null,
  servings integer not null default 4,
  prep_time integer null,
  cook_time integer null,
  image_url text null,
  is_public boolean not null default false,
  published_at timestamptz null,
  unpublished_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- foreign key to auth.users
  constraint fk_recipes_user 
    foreign key (user_id) 
    references auth.users(id) 
    on delete cascade,
  
  -- title must be 1-200 characters
  constraint chk_recipe_title_length 
    check (length(title) <= 200 and length(title) > 0),
  
  -- description limited to 5000 characters
  constraint chk_recipe_description_length 
    check (description is null or length(description) <= 5000),
  
  -- servings must be positive
  constraint chk_recipe_servings_positive 
    check (servings > 0),
  
  -- prep time must be non-negative if provided
  constraint chk_recipe_prep_time_nonnegative 
    check (prep_time is null or prep_time >= 0),
  
  -- cook time must be non-negative if provided
  constraint chk_recipe_cook_time_nonnegative 
    check (cook_time is null or cook_time >= 0)
);

-- create indexes for performance
-- index on user_id for user's recipe dashboard
create index idx_recipes_user_id 
  on public.recipes(user_id);

-- partial composite index for public feed (chronological order)
-- only indexes public recipes to reduce index size
create index idx_recipes_is_public_created 
  on public.recipes(is_public, created_at desc) 
  where is_public = true;

-- composite index for user's recipes sorted by creation date
create index idx_recipes_user_created 
  on public.recipes(user_id, created_at desc);

-- partial index on published_at for analytics queries
create index idx_recipes_published_at 
  on public.recipes(published_at desc) 
  where published_at is not null;

-- add comment to table
comment on table public.recipes is 
  'User recipes with privacy controls. Recipes can be private (owner only) or public (visible on feed).';

-- add comments to columns
comment on column public.recipes.id is 
  'Unique recipe identifier';
comment on column public.recipes.user_id is 
  'Recipe owner (references auth.users.id)';
comment on column public.recipes.title is 
  'Recipe title (1-200 characters, required)';
comment on column public.recipes.description is 
  'Recipe description (max 5000 characters, optional)';
comment on column public.recipes.instructions is 
  'Cooking instructions (required)';
comment on column public.recipes.servings is 
  'Number of servings (must be positive, defaults to 4)';
comment on column public.recipes.prep_time is 
  'Preparation time in minutes (optional)';
comment on column public.recipes.cook_time is 
  'Cooking time in minutes (optional)';
comment on column public.recipes.image_url is 
  'Recipe image URL from Supabase Storage (optional)';
comment on column public.recipes.is_public is 
  'Public visibility flag (false = private, true = public)';
comment on column public.recipes.published_at is 
  'Timestamp when recipe was first made public (set via trigger)';
comment on column public.recipes.unpublished_at is 
  'Timestamp when recipe was last made private (set via trigger)';

-- =====================================================================
-- row level security (rls) policies
-- =====================================================================

-- enable rls on recipes table
alter table public.recipes enable row level security;

-- policy: users can select their own recipes
-- allows authenticated users to view all their own recipes (private and public)
create policy "Users can select own recipes"
  on public.recipes
  for select
  to authenticated
  using (auth.uid() = user_id);

-- policy: users can insert their own recipes
-- allows authenticated users to create new recipes
create policy "Users can insert own recipes"
  on public.recipes
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- policy: users can update their own recipes
-- allows authenticated users to edit their own recipes
create policy "Users can update own recipes"
  on public.recipes
  for update
  to authenticated
  using (auth.uid() = user_id);

-- policy: users can delete their own recipes
-- allows authenticated users to delete their own recipes
create policy "Users can delete own recipes"
  on public.recipes
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- policy: anyone can read public recipes (authenticated users)
-- allows logged-in users to view public recipes on the feed
create policy "Authenticated users can read public recipes"
  on public.recipes
  for select
  to authenticated
  using (is_public = true);

-- policy: anyone can read public recipes (anonymous users)
-- allows guests to view public recipes on the feed
create policy "Anonymous users can read public recipes"
  on public.recipes
  for select
  to anon
  using (is_public = true);

-- =====================================================================
-- functions and triggers
-- =====================================================================

-- function: track recipe publication timestamps
-- automatically sets published_at when recipe becomes public
-- automatically sets unpublished_at when recipe becomes private
create or replace function public.handle_recipe_publish()
returns trigger
language plpgsql
as $$
begin
  -- if changing from private to public, set published_at
  if new.is_public = true and (old.is_public = false or old.is_public is null) then
    new.published_at = now();
  end if;
  
  -- if changing from public to private, set unpublished_at
  if new.is_public = false and old.is_public = true then
    new.unpublished_at = now();
  end if;
  
  return new;
end;
$$;

-- trigger: update publication timestamps on visibility change
create trigger on_recipe_publish_status_change
  before update of is_public on public.recipes
  for each row
  execute function public.handle_recipe_publish();

-- trigger: update updated_at on recipe changes
-- reuses the handle_updated_at function from profiles migration
create trigger set_updated_at
  before update on public.recipes
  for each row
  execute function public.handle_updated_at();

-- add comment to function
comment on function public.handle_recipe_publish() is 
  'Automatically tracks publication timestamps when recipe visibility changes between private and public';
