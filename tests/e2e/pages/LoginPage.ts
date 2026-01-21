import { expect, type Page } from "@playwright/test";

export class LoginPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto("/login");
    await expect(this.page.getByTestId("login-form")).toBeVisible();
  }

  async login(email: string, password: string) {
    await this.page.getByTestId("login-email").fill(email);
    await expect(this.page.getByTestId("login-email")).toHaveValue(email);
    await this.page.getByTestId("login-password").fill(password);
    await this.page.getByTestId("login-submit").click();

    try {
      await this.page.waitForURL("**/dashboard", { timeout: 30000 });
    } catch {
      const errorMessage = await this.page
        .getByRole("alert")
        .first()
        .textContent()
        .catch(() => null);
      if (errorMessage) {
        throw new Error(`Login failed: ${errorMessage}`);
      }
      throw new Error("Login did not redirect to /dashboard");
    }
  }
}
