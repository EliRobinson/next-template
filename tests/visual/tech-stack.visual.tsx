import { TechStack } from '@/components/tech-stack'
import { expect, test, themes } from './test'

const items = [
  { name: 'Next.js 16', description: 'App Router + Turbopack' },
  { name: 'TypeScript 5', description: 'Strict mode + path aliases' },
  { name: 'A long name that wraps onto a second line', description: 'Wrap' }
]

// Clear of every Tailwind breakpoint: `sm` is 640px and `md` 768px.
const layouts = [
  { name: 'wide', viewport: { width: 720, height: 400 } },
  { name: 'narrow', viewport: { width: 375, height: 600 } }
]

for (const layout of layouts) {
  for (const theme of themes) {
    test.describe(`tech stack grid, ${layout.name}, ${theme}`, () => {
      test.use({ viewport: layout.viewport, theme })

      test('matches the baseline', async ({ mount }) => {
        const component = await mount(<TechStack items={items} />)
        await expect(component).toHaveScreenshot(
          `tech-stack-${layout.name}-${theme}.png`
        )
      })
    })
  }
}
