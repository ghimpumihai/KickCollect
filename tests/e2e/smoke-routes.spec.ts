import { expect, test } from "@playwright/test";

test.describe("smoke route availability", () => {
  test("public and protected routes expose stable auth-aware markers", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "START COLLECTING" })).toBeVisible();

    await page.goto("/collection");
    await expect(page).toHaveURL(/\/auth/);
    await expect(page.getByRole("heading", { name: "Log In" })).toBeVisible();

    await page.goto("/card/999999");
    await expect(page).toHaveURL(/\/auth/);

    await page.goto("/auth");
    await expect(page.getByRole("heading", { name: "Log In" })).toBeVisible();
  });
});
