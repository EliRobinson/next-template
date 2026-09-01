import designSystem from '@elirobinson/eslint-config'
import prettierConfig from 'eslint-config-prettier'
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypeScript from 'eslint-config-next/typescript'
import neostandard from 'neostandard'

/** @type {import("eslint").Linter.Config[]} */
const eslintConfig = [
  {
    ignores: [
      'next-env.d.ts',
      '.next/**',
      'node_modules/**',
      'out/**',
      'build/**',
      'dist/**',
      'coverage/**',
      // Agent instructions and the skill trees written by the design system's
      // own generators. The UI-kit files there are prototype references, not
      // app code — they are never built, and a fix would be overwritten by the
      // next `ds-resync artifacts --write`.
      '.claude/**'
    ]
  },
  // Standard JS style rules, deferring formatting to Prettier.
  // TypeScript linting is left to next/typescript below — neostandard's
  // own `ts: true` registers a second @typescript-eslint plugin instance
  // that conflicts with the one next/typescript registers.
  ...neostandard({ noStyle: true }),
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports' }
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }]
    }
  },
  // The statically checkable half of `pnpm ds contracts`: no foreign UI
  // libraries, no bare design system imports, no hardcoded design values.
  // shadcn/ui output is the sanctioned gap-filler, so direct primitive
  // imports are allowed there and nowhere else.
  ...designSystem({ gapFiller: ['src/components/ui/**'] }),
  // Prettier must be last to disable conflicting formatting rules
  prettierConfig
]

export default eslintConfig
