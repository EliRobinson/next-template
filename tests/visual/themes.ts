// Every component with color gets a baseline in each theme.
export const themes = ['light', 'dark'] as const

export type Theme = (typeof themes)[number]
