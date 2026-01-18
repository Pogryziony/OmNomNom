import { type Page } from '@playwright/test';
import { RecipeFormPage } from '../pages/RecipeFormPage';
import { RecipeDetailPage } from '../pages/RecipeDetailPage';

export async function createRecipe(page: Page, overrides?: { title?: string }) {
  const title = overrides?.title ?? `E2E Recipe ${Date.now()}`;

  const form = new RecipeFormPage(page);
  await page.goto('/recipes/new');
  await form.expectLoaded();
  await form.fillRecipe({
    title,
    description: 'E2E description',
    servings: '2',
    prepTime: '15',
    instructions: 'Mix ingredients. Serve.',
    imageUrl: 'https://placehold.co/600x400',
    ingredient: { name: 'Salt', unit: 'tsp', qty: '1' },
  });

  const detail = await form.save();
  const recipeId = form.getRecipeIdFromUrl();
  await detail.expectTitle(title);

  return { recipeId, title, detail };
}

export async function deleteRecipeFromDetail(page: Page) {
  const detail = new RecipeDetailPage(page);
  await detail.delete();
  await page.waitForURL('**/dashboard');
}
