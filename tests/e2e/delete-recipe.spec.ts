import { test } from '@playwright/test';
import { login } from './utils/auth';
import { createRecipe } from './utils/recipes';
import { DashboardPage } from './pages/DashboardPage';
import { RecipeDetailPage } from './pages/RecipeDetailPage';

test('delete recipe removes it from dashboard', async ({ page }) => {
  await login(page);
  const { recipeId } = await createRecipe(page);

  const detail = new RecipeDetailPage(page);
  await detail.delete();
  await page.waitForURL('**/dashboard');

  const dashboard = new DashboardPage(page);
  await dashboard.expectLoaded();
  await dashboard.recipeCard(recipeId).expectNotVisible();
});
