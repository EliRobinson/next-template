import { test } from '@playwright/test'
import { expectDesignSystemContracts } from '@elirobinson/ai-patterns/testing/playwright'

// The half of `pnpm ds contracts` a linter cannot settle: touch targets,
// visible focus, and WCAG AA contrast, measured in a real browser.
//
// `.mts` rather than `.ts`: the helper is ESM-only, and Playwright compiles a
// plain `.ts` spec to CJS, where the subpath does not resolve.
test.describe('Design system contracts', () => {
  test('home page meets the design system contracts', async ({ page }) => {
    await page.goto('/')
    await expectDesignSystemContracts(page)
  })

  test('home page meets the contracts in dark mode', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() =>
      document.documentElement.setAttribute('data-theme', 'dark')
    )
    await expectDesignSystemContracts(page)
  })
})
