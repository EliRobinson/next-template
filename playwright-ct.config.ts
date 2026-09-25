import { existsSync } from 'node:fs'
import path from 'node:path'
import { defineConfig, devices } from '@playwright/experimental-ct-react'

// Screenshot regression tests for components in isolation. When to write one:
// docs/agents/testing.md.
//
// Baselines are rendered by Linux Chromium in the Playwright Docker image, so
// they match on every machine. `pnpm test:visual` starts that browser and
// connects to it. Any other browser draws fonts and anti-aliasing differently,
// so a run is refused unless it uses that browser or runs inside the image
// itself (which ships its browsers in /ms-playwright).
if (!process.env.PW_TEST_CONNECT_WS_ENDPOINT && !existsSync('/ms-playwright')) {
  throw new Error(
    'Visual tests need the Playwright Docker browser. Run them with `pnpm test:visual`.'
  )
}

export default defineConfig({
  testDir: './tests/visual',
  testMatch: '**/*.visual.tsx',
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}{ext}',
  fullyParallel: true,
  // The pre-push hook is the gate, and it runs without CI set. A stray
  // `test.only` would skip every other baseline. Use --grep for focused runs.
  forbidOnly: true,
  retries: 0,
  reporter: [
    ['html', { outputFolder: 'playwright-report-visual', open: 'never' }]
  ],
  outputDir: 'test-results-visual',
  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      scale: 'css'
    }
  },
  use: {
    ctTemplateDir: './tests/visual/harness',
    ctCacheDir: './tests/visual/harness/.cache',
    ctViteConfig: {
      resolve: { alias: { '@': path.resolve(__dirname, './src') } }
    },
    trace: 'retain-on-failure'
  },
  // One engine. A baseline per browser triples the upkeep and catches font
  // rendering differences, not regressions in this code.
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]
})
