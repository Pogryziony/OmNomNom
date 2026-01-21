import { test, expect } from "@playwright/test";
import { login } from "./utils/auth";
import { DashboardPage } from "./pages/DashboardPage";

test("login redirects to dashboard", async ({ page }) => {
  await login(page);
  const dashboard = new DashboardPage(page);
  await dashboard.expectLoaded();
  await expect(page.getByRole("link", { name: "New recipe" })).toBeVisible();
});
