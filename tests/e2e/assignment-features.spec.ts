import { expect, test, type Page } from "@playwright/test";

async function registerUser(page: Page, suffix: string): Promise<void> {
  await page.goto("/auth");
  await page.getByRole("button", { name: "Register" }).click();
  await page.getByLabel("Display Name").fill(`Playwright User ${suffix}`);
  await page.getByLabel("Email").fill(`playwright-${suffix}@example.com`);
  await page.getByLabel("Password").fill("Password123");
  await page.getByRole("button", { name: "Register & Continue" }).click();
  await expect(page).toHaveURL(/\/collection$/);
}

async function loginAdmin(page: Page): Promise<void> {
  await page.goto("/auth");
  await page.getByLabel("Email").fill("admin@kickcollect.local");
  await page.getByLabel("Password").fill("Password123");
  await page.getByRole("button", { name: "Secure Login" }).click();
  await expect(page).toHaveURL(/\/collection$/);
}

test.describe("assignment features", () => {
  test("stores page size preference in cookies after secure registration", async ({ page, context }) => {
    await registerUser(page, `prefs-${Date.now()}`);
    await page.locator("#collection-page-size").selectOption("10");

    const cookies = await context.cookies();
    const prefCookie = cookies.find((cookie) => cookie.name === "kc_page_size");
    expect(prefCookie?.value).toBe("10");
  });

  test("creates a new card from the protected collection page", async ({ page }) => {
    await loginAdmin(page);
    await page.getByRole("button", { name: "+ ADD CARD" }).click();

    await page.locator("#create-player").fill("Playwright Star");
    await page.locator("#create-series").fill("Automation Series 2026");
    await page.locator("#create-number").fill("#777");
    await page.locator("#create-team").fill("QA United");
    await page.locator("#create-year").fill("2026");
    await page.locator("#create-value").fill("$20.00");
    await page.locator("#create-dupes").fill("1");

    await page.getByRole("button", { name: "Create Card" }).click();

    await expect(page.getByText(/Showing\s+7\s+of\s+7\s+cards/i)).toBeVisible();
    await page.getByRole("button", { name: "2" }).click();
    await expect(page.getByRole("link", { name: "Playwright Star" })).toBeVisible();
  });

  test("persists CRUD data across refresh for an authenticated user", async ({ page }) => {
    await loginAdmin(page);
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
    await registerUser(page, `update-${Date.now()}`);
    await page.goto("/card/1");
    await page.getByRole("button", { name: /edit card/i }).click();
    await expect(page.getByRole("heading", { name: "Edit Card" })).toBeVisible();

    await page.getByLabel("Player").fill("Kylian Mbappe Updated");
    await page.getByRole("button", { name: "Save Changes" }).click();

    await expect(page.getByRole("heading", { name: "Kylian Mbappe Updated" })).toBeVisible();
  });

  test("deletes an existing card from detail view", async ({ page }) => {
    await registerUser(page, `delete-${Date.now()}`);
    await page.goto("/card/6");
    await page.getByRole("button", { name: /delete/i }).click();
    await page.getByRole("button", { name: "Confirm delete" }).click();

    await expect(page).toHaveURL(/\/collection$/);
    await expect(page.getByRole("link", { name: "Rodri" })).toHaveCount(0);
  });
});
