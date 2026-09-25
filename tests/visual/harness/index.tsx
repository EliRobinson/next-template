import { beforeMount } from '@playwright/experimental-ct-react/hooks'
import type { Theme } from '../themes'
import '@/app/styles'

export interface HooksConfig {
  theme: Theme
}

// Sets the theme on every mount, so no test inherits one from the test before
// it. `tests/visual/test.ts` always passes it.
beforeMount<HooksConfig>(async ({ hooksConfig }) => {
  if (!hooksConfig) throw new Error('Import `test` from tests/visual/test.ts.')
  document.documentElement.setAttribute('data-theme', hooksConfig.theme)
})
