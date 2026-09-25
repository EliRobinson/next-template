import { expect, test } from '@playwright/experimental-ct-react'
import { TechStack } from '@/components/tech-stack'

const items = [
  { name: 'Next.js 16', description: 'App Router + Turbopack' },
  { name: 'TypeScript 5', description: 'Strict mode + path aliases' },
  { name: 'A long name that wraps onto a second line', description: 'Wrap' }
]

test.use({ viewport: { width: 640, height: 400 } })

for (const theme of ['light', 'dark'] as const) {
  test(`tech stack grid, ${theme}`, async ({ mount, page }) => {
    await page.evaluate(
      (t) => document.documentElement.setAttribute('data-theme', t),
      theme
    )
    const component = await mount(<TechStack items={items} />)
    await expect(component).toHaveScreenshot(`tech-stack-${theme}.png`)
  })
}
