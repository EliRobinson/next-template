import { beforeMount } from '@playwright/experimental-ct-react/hooks'
import '@/app/styles'

export type Theme = 'light' | 'dark'

export interface HooksConfig {
  theme?: Theme
}

// Every mount sets the theme, so no test inherits one from the test before it.
beforeMount<HooksConfig>(async ({ hooksConfig }) => {
  document.documentElement.setAttribute(
    'data-theme',
    hooksConfig?.theme ?? 'light'
  )
})
