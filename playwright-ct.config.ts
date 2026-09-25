import path from 'node:path'
import { defineConfig, devices } from '@playwright/experimental-ct-react'

// Screenshot regression tests for components in isolation. E2E specs in e2e/
// assert behavior and never compare pixels. See docs/agents/testing.md.
//
// Baselines are rendered by Linux Chromium in the Playwright Docker image, so
// they match on every machine. `pnpm test:visual` starts that browser and
// connects to it. A browser on another OS draws fonts and anti-aliasing
// differently, so a run without it is refused rather than left to fail on
// pixel noise.
if (process.platform !== 'linux' && !process.env.PW_TEST_CONNECT_WS_ENDPOINT) {
  throw new Error(
    'Visual tests need the Linux browser. Run them with `pnpm test:visual`.'
  )
}

export default defineConfig({
  testDir: './tests/visual',
  testMatch: '**/*.visual.tsx',
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}{ext}',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
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
