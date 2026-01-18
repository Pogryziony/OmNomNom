import { test } from '@playwright/test';
import { login } from './utils/auth';
import { createRecipe, deleteRecipeFromDetail } from './utils/recipes';
import { RecipeDetailPage } from './pages/RecipeDetailPage';

test('edit recipe updates fields', async ({ page }) => {
  await login(page);
  const { recipeId, title } = await createRecipe(page);

  const detail = new RecipeDetailPage(page);
  const form = await detail.openEdit();
  await form.waitForPrefill('15');
  await form.fillRecipe({
    title,
    description: 'Updated description',
    servings: '2',
    prepTime: '25',
    instructions: 'Mix ingredients. Serve.',
    imageUrl: 'https://placehold.co/600x400',
    ingredient: { name: 'Salt', unit: 'tsp', qty: '1' },
  });
  await form.save();

  await detail.expectPrepTime('25');
  await detail.expectDescription('Updated description');

  await deleteRecipeFromDetail(page);
});
