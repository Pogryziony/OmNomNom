-- =====================================================================
-- Migration: Create profiles table
-- Description: User profile information extending Supabase auth.users
-- Author: Database Architecture Team
-- Date: 2025-10-25
-- 
-- Tables Created:
--   - profiles
--
-- Dependencies:
--   - auth.users (Supabase Auth)
--
-- Security:
--   - Row Level Security (RLS) enabled
--   - Users can view and update their own profile
--   - Public profiles visible for users with public recipes
-- =====================================================================

-- create profiles table
-- this table extends auth.users with application-specific user data
create table public.profiles (
  id uuid not null primary key,
  username text not null unique,
  display_name text null,
  bio text null,
  avatar_url text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- foreign key to supabase auth.users
  constraint fk_profiles_user 
    foreign key (id) 
    references auth.users(id) 
    on delete cascade,
  
  -- username must be 3-20 characters
  constraint chk_username_length 
    check (length(username) between 3 and 20),
  
  -- bio limited to 500 characters
  constraint chk_bio_length 
    check (bio is null or length(bio) <= 500)
);

-- create indexes for performance
-- unique index on username for quick lookups
create unique index idx_profiles_username 
  on public.profiles(username);

-- index on created_at for sorting user lists
create index idx_profiles_created_at 
  on public.profiles(created_at desc);

-- add comment to table
comment on table public.profiles is 
  'User profile information extending Supabase auth.users with application-specific data';

-- add comments to columns
comment on column public.profiles.id is 
  'User ID (matches auth.users.id)';
comment on column public.profiles.username is 
  'Unique username displayed on public recipes (3-20 chars)';
comment on column public.profiles.display_name is 
  'Full display name (defaults to username if not provided)';
comment on column public.profiles.bio is 
  'User bio for future profile pages (max 500 chars)';
comment on column public.profiles.avatar_url is 
  'Profile picture URL (stored in Supabase Storage)';

-- =====================================================================
-- row level security (rls) policies
-- =====================================================================

-- enable rls on profiles table
-- this ensures all queries are filtered by security policies
alter table public.profiles enable row level security;

-- policy: users can view their own profile
-- allows authenticated users to select their own profile data
create policy "Users can view own profile"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

-- policy: users can update their own profile
-- allows authenticated users to update their own profile data
create policy "Users can update own profile"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id);

-- note: additional policy for public profile visibility will be added
-- in a later migration after the recipes table is created (migration 007)
-- to avoid forward-reference dependency issues

-- =====================================================================
-- functions and triggers
-- =====================================================================

-- function: automatically create profile when user signs up
-- this function is triggered after a new user is created in auth.users
-- it creates a corresponding profile record with default values
create or replace function public.handle_new_user()
returns trigger
security definer
set search_path = public
language plpgsql
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    -- use username from metadata or email prefix as fallback
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    -- use display_name from metadata or email prefix as fallback
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

-- trigger: create profile on user signup
-- automatically creates a profile record when a new user signs up
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- function: update updated_at timestamp
-- this function automatically updates the updated_at column on row updates
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- trigger: update updated_at on profile changes
-- automatically sets updated_at to current timestamp when profile is modified
create trigger set_updated_at
  before update on public.profiles
  for each row
  execute function public.handle_updated_at();

-- add comment to function
comment on function public.handle_new_user() is 
  'Automatically creates a profile record when a new user signs up via Supabase Auth';

comment on function public.handle_updated_at() is 
  'Automatically updates the updated_at timestamp when a record is modified';
