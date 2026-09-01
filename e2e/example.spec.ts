import { test, expect } from '@playwright/test'

test.describe('Home page', () => {
  test('loads and shows heading', async ({ page }) => {
    await page.goto('/')
    await expect(
      page.getByRole('heading', { name: 'Next Template' })
    ).toBeVisible()
  })

  test('displays the tech stack', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Next.js 16', { exact: true })).toBeVisible()
    await expect(
      page.getByText('Tailwind CSS 4', { exact: true })
    ).toBeVisible()
    await expect(
      page.getByText('@elirobinson/react', { exact: true })
    ).toBeVisible()
  })
})
