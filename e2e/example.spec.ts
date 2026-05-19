import { test, expect } from "@playwright/test";

test.describe("Home page", () => {
  test("loads and shows heading", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Next Template" })).toBeVisible();
  });

  test("displays the tech stack cards", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Next.js 15")).toBeVisible();
    await expect(page.getByText("Tailwind CSS 4")).toBeVisible();
    await expect(page.getByText("shadcn/ui")).toBeVisible();
  });
});
