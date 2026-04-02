import { expect, test } from "@playwright/test";

test.describe("smoke route availability", () => {
  test("critical routes render stable markers", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "START COLLECTING" })).toBeVisible();

    await page.goto("/collection");
    await expect(page.getByRole("heading", { name: "Collection" })).toBeVisible();

    await page.goto("/card/999999");
    await expect(page.getByRole("heading", { name: "Card not found" })).toBeVisible();

    await page.goto("/auth");
    await expect(page.getByRole("heading", { name: "Log In" })).toBeVisible();
  });
});
