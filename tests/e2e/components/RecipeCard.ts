import { expect, type Locator, type Page } from '@playwright/test';

export class RecipeCard {
  readonly page: Page;
  readonly card: Locator;

  constructor(page: Page, card: Locator) {
    this.page = page;
    this.card = card;
  }

  static fromPublicFeed(page: Page, recipeId: string) {
    return new RecipeCard(page, page.getByTestId(`public-recipe-card-${recipeId}`));
  }

  static fromDashboard(page: Page, recipeId: string) {
    return new RecipeCard(page, page.getByTestId(`my-recipe-card-${recipeId}`));
  }

  async expectVisible() {
    await expect(this.card).toBeVisible();
  }

  async expectNotVisible() {
    await expect(this.card).toHaveCount(0);
  }

  async open() {
    await this.card.getByRole('link').first().click();
  }
}
