import { test, expect } from "@playwright/test";

test.describe("Home page", () => {
  test("loads and shows heading", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Next Template" })).toBeVisible();
  });

  test("displays the tech stack cards", async ({ page }) => {
    await page.goto("/");
    const stackCards = page.locator(".grid");
    await expect(stackCards.getByText("Next.js 15", { exact: true })).toBeVisible();
    await expect(stackCards.getByText("Tailwind CSS 4", { exact: true })).toBeVisible();
    await expect(stackCards.getByText("shadcn/ui", { exact: true })).toBeVisible();
  });
});
