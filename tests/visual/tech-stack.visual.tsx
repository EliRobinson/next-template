import { expect, test } from '@playwright/experimental-ct-react'
import { TechStack } from '@/components/tech-stack'
import type { HooksConfig } from './harness'
import { themes } from './themes'

const items = [
  { name: 'Next.js 16', description: 'App Router + Turbopack' },
  { name: 'TypeScript 5', description: 'Strict mode + path aliases' },
  { name: 'A long name that wraps onto a second line', description: 'Wrap' }
]

// Widths clear of the `sm` breakpoint (640px) on each side.
const layouts = [
  { name: 'wide', viewport: { width: 768, height: 400 } },
  { name: 'narrow', viewport: { width: 375, height: 600 } }
]

for (const layout of layouts) {
  test.describe(`tech stack grid, ${layout.name}`, () => {
    test.use({ viewport: layout.viewport })

    for (const theme of themes) {
      test(theme, async ({ mount }) => {
        const component = await mount<HooksConfig>(
          <TechStack items={items} />,
          { hooksConfig: { theme } }
        )
        await expect(component).toHaveScreenshot(
          `tech-stack-${layout.name}-${theme}.png`
        )
      })
    }
  })
}
