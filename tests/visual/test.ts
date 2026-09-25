import { test as base } from '@playwright/experimental-ct-react'
import type { HooksConfig } from './harness'
import { themes } from './themes'
import type { Theme } from './themes'

export { expect } from '@playwright/experimental-ct-react'
export { themes }

// `test` with a `theme` option. Every `mount` renders in that theme, so a
// test sets it with `test.use({ theme })` and never touches the harness.
export const test = base.extend<{ theme: Theme }>({
  theme: [themes[0], { option: true }],
  // `provide`, not the usual `use`: the React hooks lint rule reads `use` as
  // React's hook.
  mount: async ({ mount, theme }, provide) => {
    await provide((component, options) =>
      mount<HooksConfig>(component, { ...options, hooksConfig: { theme } })
    )
  }
})
