import { test } from "@playwright/test";
import { login } from "./utils/auth";
import { createRecipe, deleteRecipeFromDetail } from "./utils/recipes";
import { PublicFeedPage } from "./pages/PublicFeedPage";
import { RecipeDetailPage } from "./pages/RecipeDetailPage";

test("toggle visibility updates public feed", async ({ page }) => {
  await login(page);
  const { recipeId } = await createRecipe(page);

  const detail = new RecipeDetailPage(page);
  await detail.expectVisibility("Private");
  await detail.toggleVisibility();
  await detail.expectVisibility("Public");

  const feed = new PublicFeedPage(page);
  await feed.goto();
  await feed.recipeCard(recipeId).expectVisible();

  await page.goto(`/recipes/${recipeId}`);
  await detail.toggleVisibility();
  await detail.expectVisibility("Private");

  await feed.goto();
  await feed.recipeCard(recipeId).expectNotVisible();

  await page.goto(`/recipes/${recipeId}`);
  await deleteRecipeFromDetail(page);
});
