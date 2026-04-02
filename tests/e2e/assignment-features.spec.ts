import { expect, test } from "@playwright/test";


  test("stores page size preference in cookies", async ({ page, context }) => {
    await page.goto("/collection");
    await page.locator("#collection-page-size").selectOption("10");

    const cookies = await context.cookies();
    const prefCookie = cookies.find((cookie) => cookie.name === "kc_page_size");
    expect(prefCookie?.value).toBe("10");
  });

  test("creates a new card from the collection page", async ({ page }) => {
    await page.goto("/collection");
    await page.getByRole("button", { name: "+ ADD CARD" }).click();

    await page.locator("#create-player").fill("Playwright Star");
    await page.locator("#create-series").fill("Automation Series 2026");
    await page.locator("#create-number").fill("#777");
    await page.locator("#create-team").fill("QA United");
    await page.locator("#create-year").fill("2026");
    await page.locator("#create-value").fill("$20.00");
    await page.locator("#create-dupes").fill("1");

    await page.getByRole("button", { name: "Create Card" }).click();

    await expect(page.getByText("Showing 7 of 7 cards")).toBeVisible();
    await page.getByRole("button", { name: "2" }).click();
    await expect(page.getByRole("link", { name: "Playwright Star" })).toBeVisible();
  });

  test("persists CRUD data across refresh (sessionStorage)", async ({ page }) => {
    await page.goto("/collection");
    await page.getByRole("button", { name: "+ ADD CARD" }).click();

    await page.locator("#create-player").fill("Refresh Persisted");
    await page.locator("#create-series").fill("Auto Refresh 2026");
    await page.locator("#create-number").fill("#888");
    await page.locator("#create-team").fill("QA Refresh");
    await page.locator("#create-year").fill("2026");
    await page.locator("#create-value").fill("$12.00");
    await page.locator("#create-dupes").fill("0");
    await page.getByRole("button", { name: "Create Card" }).click();

    await page.getByLabel("Search").fill("Refresh Persisted");
    await expect(page.getByRole("link", { name: "Refresh Persisted" })).toBeVisible();

    await page.reload();
    await page.getByLabel("Search").fill("Refresh Persisted");
    await expect(page.getByRole("link", { name: "Refresh Persisted" })).toBeVisible();
  });

  test("updates an existing card from detail view", async ({ page }) => {
    await page.goto("/card/1");
    await page.getByRole("button", { name: /edit card/i }).click();
    await expect(page.getByRole("heading", { name: "Edit Card" })).toBeVisible();

    await page.getByLabel("Player").fill("Kylian Mbappe Updated");
    await page.getByRole("button", { name: "Save Changes" }).click();

    await expect(page.getByRole("heading", { name: "Kylian Mbappe Updated" })).toBeVisible();
  });

  test("deletes an existing card from detail view", async ({ page }) => {
    await page.goto("/card/6");
    await page.getByRole("button", { name: "🗑 Delete" }).click();
    await page.getByRole("button", { name: "Confirm delete" }).click();

    await expect(page).toHaveURL(/\/collection$/);
    await expect(page.getByRole("link", { name: "Rodri" })).toHaveCount(0);
  });
