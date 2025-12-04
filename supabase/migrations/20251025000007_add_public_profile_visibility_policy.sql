-- =====================================================================
-- Migration: Add public profile visibility policy
-- Description: Allows viewing profiles of users with public recipes
-- Author: Database Architecture Team
-- Date: 2025-10-25
-- 
-- Tables Modified:
--   - profiles (add RLS policy)
--
-- Dependencies:
--   - public.profiles (migration 001)
--   - public.recipes (migration 003)
--
-- Security:
--   - Public profiles visible for users who have published recipes
--
-- Notes:
--   - This policy was separated from the profiles table creation
--     to avoid forward-reference dependency issues
--   - Must be created AFTER recipes table exists
-- =====================================================================

-- policy: public profiles visible for recipe authors
-- allows anyone (authenticated or anonymous) to view profiles of users
-- who have published public recipes
-- this is needed to display author information on public recipe feed
create policy "Public profiles visible for public recipes"
  on public.profiles
  for select
  to anon, authenticated
  using (
    exists (
      select 1 
      from public.recipes
      where recipes.user_id = profiles.id
        and recipes.is_public = true
    )
  );

-- add comment explaining the policy
comment on policy "Public profiles visible for public recipes" on public.profiles is 
  'Allows viewing profiles of users who have published at least one public recipe. Required for displaying author information on the public recipe feed.';
