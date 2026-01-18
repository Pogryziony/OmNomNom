import { expect, type Page } from '@playwright/test';
import { RecipeCard } from '../components/RecipeCard';

export class DashboardPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async expectLoaded() {
    await expect(this.page.getByRole('heading', { name: 'My recipes' })).toBeVisible();
    await expect(this.page.getByTestId('my-recipes-list')).toBeVisible();
  }

  async openNewRecipe() {
    await this.page.getByRole('link', { name: 'New recipe' }).click();
  }

  recipeCard(recipeId: string) {
    return RecipeCard.fromDashboard(this.page, recipeId);
  }
}
