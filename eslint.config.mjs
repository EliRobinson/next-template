import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { FlatCompat } from '@eslint/eslintrc'
import prettierConfig from 'eslint-config-prettier'
import neostandard from 'neostandard'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname
})

// @elirobinson/react is the component source of truth for this template.
// These bans keep a second UI vocabulary from creeping in; see AGENTS.md and
// docs/design-system.md for the sourcing order.
const FOREIGN_UI_LIBRARIES = {
  group: [
    '@mui/*',
    '@material-ui/*',
    '@chakra-ui/*',
    '@mantine/*',
    '@nextui-org/*',
    '@heroui/*',
    'antd',
    'antd/*',
    'react-bootstrap',
    'react-bootstrap/*',
    '@headlessui/*',
    'daisyui'
  ],
  message:
    'Use @elirobinson/react instead (run `pnpm ds` for the inventory). shadcn/ui in src/components/ui/ is the only sanctioned fallback.'
}

const DIRECT_PRIMITIVES = {
  group: ['@radix-ui/*', 'radix-ui', 'radix-ui/*'],
  message:
    'The design system already wraps these primitives — import from @elirobinson/react/components/<Name>. Direct Radix use is allowed only inside src/components/ui/ (shadcn output).'
}

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
      'coverage/**'
    ]
  },
  // Standard JS style rules, deferring formatting to Prettier.
  // TypeScript linting is left to next/typescript below — neostandard's
  // own `ts: true` registers a second @typescript-eslint plugin instance
  // that conflicts with the one next/typescript registers.
  ...neostandard({ noStyle: true }),
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
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
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-restricted-imports': [
        'error',
        { patterns: [FOREIGN_UI_LIBRARIES, DIRECT_PRIMITIVES] }
      ]
    }
  },
  // shadcn/ui components are generated against Radix primitives directly.
  // They are the sanctioned gap-filler, so only the foreign-library ban applies.
  {
    files: ['src/components/ui/**'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [FOREIGN_UI_LIBRARIES] }]
    }
  },
  {
    files: ['scripts/**'],
    rules: { 'no-console': 'off' }
  },
  // Prettier must be last to disable conflicting formatting rules
  prettierConfig
]

export default eslintConfig
