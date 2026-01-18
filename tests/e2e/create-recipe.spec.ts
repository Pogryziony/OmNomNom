import { test, expect } from '@playwright/test';
import { login } from './utils/auth';
import { createRecipe, deleteRecipeFromDetail } from './utils/recipes';

test('create recipe shows on detail page', async ({ page }) => {
  await login(page);
  const { title, detail } = await createRecipe(page);

  await detail.expectTitle(title);
  await expect(page.getByText('Servings: 2')).toBeVisible();
  await expect(page.getByText('Preparation time: 15 min')).toBeVisible();

  await deleteRecipeFromDetail(page);
});
