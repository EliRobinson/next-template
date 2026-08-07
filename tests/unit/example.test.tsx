import { describe, expect, it } from 'vitest'

import { cn } from '@/lib/utils'

describe('cn utility', () => {
  it.each([
    {
      name: 'merges conflicting class names',
      input: ['px-4 py-2', 'px-6'] as const,
      expected: 'py-2 px-6'
    },
    {
      name: 'drops falsy conditional classes',
      input: ['base', false && 'ignored', 'included'] as const,
      expected: 'base included'
    }
  ])('$name', ({ input, expected }) => {
    expect(cn(...input)).toBe(expected)
  })
})
