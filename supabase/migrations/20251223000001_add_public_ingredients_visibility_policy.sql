-- =====================================================================
-- Migration: Add public ingredient visibility policy
-- Description: Allows anonymous users to read ingredient rows referenced by public recipes
-- Author: OmNomNom
-- Date: 2025-12-23
--
-- Tables Modified:
--   - ingredients (add RLS policy)
--
-- Dependencies:
--   - public.ingredients (migration 002)
--   - public.recipes (migration 003)
--   - public.recipe_ingredients (migration 004)
--
-- Security:
--   - Anonymous users can read ingredients that appear in at least one public recipe
-- =====================================================================

-- policy: anonymous users can read ingredients used in public recipes
create policy "Anonymous users can read public ingredients"
  on public.ingredients
  for select
  to anon
  using (
    exists (
      select 1
      from public.recipe_ingredients
      join public.recipes on recipes.id = recipe_ingredients.recipe_id
      where recipe_ingredients.ingredient_id = ingredients.id
        and recipes.is_public = true
    )
  );
