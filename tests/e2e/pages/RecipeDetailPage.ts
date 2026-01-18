import { expect, type Page } from '@playwright/test';
import { RecipeFormPage } from './RecipeFormPage';

export class RecipeDetailPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async expectTitle(title: string) {
    await expect(this.page.getByRole('heading', { name: title })).toBeVisible();
  }

  async expectPrepTime(value: string) {
    await expect(this.page.getByText(`Preparation time: ${value} min`)).toBeVisible();
  }

  async expectDescription(text: string) {
    await expect(this.page.getByText(text)).toBeVisible();
  }

  async openEdit() {
    await this.page.getByTestId('recipe-edit').click();
    const form = new RecipeFormPage(this.page);
    await form.expectLoaded();
    return form;
  }

  async toggleVisibility() {
    await this.page.getByTestId('recipe-visibility-toggle').click();
  }

  async expectVisibility(status: 'Public' | 'Private') {
    await expect(this.page.getByTestId('recipe-visibility-status')).toHaveText(status);
  }

  async delete() {
    await this.page.getByTestId('recipe-delete').click();
  }
}
