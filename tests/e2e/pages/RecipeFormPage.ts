import { expect, type Page } from "@playwright/test";
import { RecipeDetailPage } from "./RecipeDetailPage";

export class RecipeFormPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async expectLoaded() {
    await expect(this.page.getByTestId("recipe-form")).toBeVisible();
  }

  async waitForPrefill(prepTime: string) {
    await expect(this.page.getByTestId("recipe-prep-time")).toHaveValue(
      prepTime,
    );
  }

  async fillRecipe(data: {
    title: string;
    description: string;
    servings: string;
    prepTime: string;
    instructions: string;
    imageUrl: string;
    ingredient: { name: string; unit: string; qty: string };
  }) {
    await this.page.getByTestId("recipe-title").fill(data.title);
    await this.page.getByTestId("recipe-description").fill(data.description);
    await this.page.getByTestId("recipe-servings").fill(data.servings);
    await this.page.getByTestId("recipe-prep-time").fill(data.prepTime);
    await this.page.getByTestId("recipe-instructions").fill(data.instructions);
    await this.page.getByTestId("recipe-image-url").fill(data.imageUrl);

    await this.page.locator("#ingredient-name-0").fill(data.ingredient.name);
    await this.page.locator("#ingredient-unit-0").fill(data.ingredient.unit);
    await this.page.locator("#ingredient-qty-0").fill(data.ingredient.qty);
  }

  async save(): Promise<RecipeDetailPage> {
    const saveButton = this.page.getByTestId("recipe-save");
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    await this.page.waitForURL((url) => {
      const path = new URL(url).pathname;
      return /\/recipes\/[^/]+$/.test(path) && !path.endsWith("/new");
    });

    return new RecipeDetailPage(this.page);
  }

  getRecipeIdFromUrl(): string {
    const match = this.page.url().match(/\/recipes\/([^/]+)(?:\/edit)?$/);
    if (!match) {
      throw new Error("Failed to extract recipe id from URL");
    }
    return match[1];
  }
}
