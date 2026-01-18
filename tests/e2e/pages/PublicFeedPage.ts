import { expect, type Page } from '@playwright/test';
import { RecipeCard } from '../components/RecipeCard';

export class PublicFeedPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/');
    await expect(this.page.getByTestId('public-feed-list')).toBeVisible();
  }

  recipeCard(recipeId: string) {
    return RecipeCard.fromPublicFeed(this.page, recipeId);
  }
}
