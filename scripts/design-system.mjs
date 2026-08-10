#!/usr/bin/env node

// Prints a live inventory of the installed @elirobinson design system.
// Everything is read from node_modules at run time, so this never goes stale:
// bumping @elirobinson/react, /tokens or /ai-patterns is the only update needed.
// Component discovery is layout-agnostic — flat or tiered directories both work.

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const REACT_PKG = '@elirobinson/react'
const TOKENS_PKG = '@elirobinson/tokens'
const PATTERNS_PKG = '@elirobinson/ai-patterns'

function findPackageDir(name) {
  let dir = dirname(fileURLToPath(import.meta.url))
  while (true) {
    const candidate = join(dir, 'node_modules', ...name.split('/'))
    if (existsSync(candidate)) return candidate
    const parent = resolve(dir, '..')
    if (parent === dir) return null
    dir = parent
  }
}

function readFile(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : null
}

function version(pkgDir) {
  const manifest = pkgDir && readFile(join(pkgDir, 'package.json'))
  return manifest ? JSON.parse(manifest).version : null
}

function walk(dir, extension) {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return walk(path, extension)
    return entry.name.endsWith(extension) ? [path] : []
  })
}

// Subpaths relative to the module root, e.g. 'Button' or 'atoms/Button'.
// Import specifier is always `<pkg>/<kind>/<subpath>`, whatever the layout.
function moduleSubpaths(root) {
  return walk(root, '.d.ts')
    .map((path) =>
      relative(root, path)
        .replace(/\.d\.ts$/, '')
        .split(sep)
        .join('/')
    )
    .sort()
}

function tierOf(subpath) {
  const segments = subpath.split('/')
  return segments.length > 1 ? segments.slice(0, -1).join('/') : ''
}

function baseNameOf(subpath) {
  return subpath.split('/').pop()
}

function valueExports(declaration) {
  return [
    ...declaration.matchAll(/export declare (?:const|function) (\w+)/g)
  ].map((match) => match[1])
}

function unionTypes(declaration) {
  return [
    ...declaration.matchAll(/export type (\w+) = ((?:'[^']*'\s*\|?\s*)+);/g)
  ]
    .map(([, name, body]) => ({
      name,
      values: [...body.matchAll(/'([^']*)'/g)].map((match) => match[1])
    }))
    .filter(({ values }) => values.length > 1)
}

function cssClasses(css) {
  if (!css) return []
  return [
    ...new Set([...css.matchAll(/^\.([\w-]+)/gm)].map((m) => m[1]))
  ].sort()
}

function cssVariables(css) {
  if (!css) return []
  const seen = new Map()
  for (const [, name, value] of css.matchAll(/^\s*(--[\w-]+):\s*([^;]+);/gm)) {
    if (!seen.has(name)) seen.set(name, value.trim())
  }
  return [...seen.entries()].map(([name, value]) => ({ name, value }))
}

function group(items, keyOf) {
  const groups = new Map()
  for (const item of items) {
    const key = keyOf(item)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(item)
  }
  return groups
}

const reactDir = findPackageDir(REACT_PKG)
const tokensDir = findPackageDir(TOKENS_PKG)
const patternsDir = findPackageDir(PATTERNS_PKG)

if (!reactDir || !tokensDir) {
  const missing = [!reactDir && REACT_PKG, !tokensDir && TOKENS_PKG]
    .filter(Boolean)
    .join(', ')
  console.error(
    `Design system not installed (missing: ${missing}).\n\n  export NODE_AUTH_TOKEN=<github-pat-with-read:packages>\n  pnpm install`
  )
  process.exit(1)
}

const componentsDir = join(reactDir, 'dist', 'components')
const hooksDir = join(reactDir, 'dist', 'hooks')
const componentSrcDir = join(reactDir, 'src', 'components')
const tokensCss = readFile(join(tokensDir, 'src', 'tokens.css'))
const componentCss = walk(join(reactDir, 'src'), '.css')
  .map((path) => readFile(path))
  .join('\n')

const [command = 'list', ...args] = process.argv.slice(2)

const commands = { list, tokens, classes, props, patterns, contracts, prompts }

if (!commands[command]) {
  // Bare `pnpm ds Button` is treated as `pnpm ds props Button`.
  if (/^[A-Z]/.test(command)) props(command)
  else usage()
} else {
  commands[command](...args)
}

function usage() {
  console.log(`Usage: pnpm ds [command]

  list              Components, hooks, typography classes (default)
  props <Name>      Full prop/variant types for one component
  tokens [filter]   Design tokens (CSS custom properties)
  classes [filter]  CSS classes shipped by the design system
  patterns          AI product patterns (${PATTERNS_PKG})
  contracts         Machine-checkable UI contracts agents must satisfy
  prompts [name]    Reusable prompt templates

Shorthand: pnpm ds Button === pnpm ds props Button`)
  process.exit(1)
}

function requirePatterns() {
  if (patternsDir) return patternsDir
  console.error(
    `${PATTERNS_PKG} is not installed.\n\n  export NODE_AUTH_TOKEN=<github-pat-with-read:packages>\n  pnpm add -D ${PATTERNS_PKG}@latest`
  )
  process.exit(1)
}

function list() {
  const installed = [
    `${REACT_PKG}@${version(reactDir)}`,
    `${TOKENS_PKG}@${version(tokensDir)}`,
    patternsDir
      ? `${PATTERNS_PKG}@${version(patternsDir)}`
      : `${PATTERNS_PKG} (not installed)`
  ]
  console.log(installed.join('  '))
  console.log('Source of truth: https://github.com/EliRobinson/design-system\n')

  const subpaths = moduleSubpaths(componentsDir)
  console.log(
    `COMPONENTS (${subpaths.length})  import { X } from '${REACT_PKG}/components/<subpath>'`
  )
  for (const [tier, members] of group(subpaths, tierOf)) {
    if (tier) console.log(`\n  ${tier}/`)
    for (const subpath of members) {
      const declaration = readFile(join(componentsDir, `${subpath}.d.ts`)) ?? ''
      const name = baseNameOf(subpath)
      const variants = unionTypes(declaration)
        .map(
          ({ name: type, values }) =>
            `${type.replace(name, '').toLowerCase()}: ${values.join('|')}`
        )
        .join('  ')
      console.log(
        `    ${name.padEnd(16)} ${valueExports(declaration).join(', ')}`
      )
      if (variants) console.log(`    ${''.padEnd(16)} ${variants}`)
    }
  }

  const hooks = moduleSubpaths(hooksDir)
  if (hooks.length) {
    console.log(`\nHOOKS  import { x } from '${REACT_PKG}/hooks/<name>'`)
    console.log(`  ${hooks.join('  ')}`)
  }

  const typography = cssClasses(tokensCss)
  if (typography.length) {
    console.log(
      '\nTYPOGRAPHY CLASSES  use these instead of ad-hoc font-size utilities'
    )
    console.log(`  ${typography.join('  ')}`)
  }

  const variables = cssVariables(tokensCss)
  if (variables.length) {
    const prefixes = group(variables, ({ name }) => name.split('-')[2] ?? name)
    console.log(
      `\nTOKENS  ${variables.length} custom properties — run \`pnpm ds tokens\` for values`
    )
    console.log(`  groups: ${[...prefixes.keys()].slice(0, 24).join(', ')}`)
  }

  if (patternsDir) {
    console.log(
      '\nAI PATTERNS  `pnpm ds patterns`, `pnpm ds contracts`, `pnpm ds prompts`'
    )
  }

  console.log(
    '\nNext: `pnpm ds props <Name>` for props, `pnpm ds tokens color` for values.'
  )
}

function props(name) {
  if (!name) usage()
  const subpaths = moduleSubpaths(componentsDir)
  const match =
    subpaths.find((subpath) => subpath === name) ??
    subpaths.find((subpath) => baseNameOf(subpath) === name)
  if (!match) {
    console.error(
      `No component named "${name}".\n\nAvailable: ${subpaths.join(', ')}`
    )
    process.exit(1)
  }
  const declaration = readFile(join(componentsDir, `${match}.d.ts`))
  console.log(
    `// import from '${REACT_PKG}/components/${match}' (v${version(reactDir)})`
  )
  console.log(declaration.replace(/\/\/# sourceMappingURL.*\n?/, '').trim())
  const source = join(componentSrcDir, `${match}.tsx`)
  if (existsSync(source)) console.log(`\n// Implementation: ${source}`)
}

function tokens(filter) {
  const variables = cssVariables(tokensCss).filter(
    ({ name, value }) =>
      !filter || name.includes(filter) || value.includes(filter)
  )
  if (!variables.length) {
    console.error(`No tokens match "${filter}".`)
    process.exit(1)
  }
  const width = Math.max(...variables.map(({ name }) => name.length))
  for (const { name, value } of variables) {
    console.log(`  ${name.padEnd(width)}  ${value}`)
  }
  console.log(
    '\nUse as var(--token) or Tailwind arbitrary values: text-[var(--fg-2)]'
  )
}

function classes(filter) {
  const all = [...cssClasses(tokensCss), ...cssClasses(componentCss)].filter(
    (name) => !filter || name.includes(filter)
  )
  if (!all.length) {
    console.error(`No classes match "${filter}".`)
    process.exit(1)
  }
  for (const [prefix, names] of group(
    all,
    (name) => name.split('__')[0].split('--')[0]
  )) {
    console.log(`  ${prefix.padEnd(24)} ${[...new Set(names)].join(' ')}`)
  }
}

function patterns() {
  console.log(readFile(join(requirePatterns(), 'src', 'patterns.md')).trim())
}

function contracts() {
  const raw = readFile(join(requirePatterns(), 'src', 'contracts.json'))
  const { componentConstraints = {}, ...rest } = JSON.parse(raw)
  for (const [section, body] of Object.entries(rest)) {
    console.log(`${section.toUpperCase()}`)
    for (const [key, value] of Object.entries(body)) {
      console.log(
        `  ${key}: ${Array.isArray(value) ? value.join(', ') : value}`
      )
    }
    console.log('')
  }
  console.log('COMPONENT CONSTRAINTS  every one of these must hold')
  for (const [name, { summary, check }] of Object.entries(
    componentConstraints
  )) {
    console.log(`\n  ${name}\n    ${summary}\n    check: ${check}`)
  }
}

function prompts(name) {
  const dir = join(requirePatterns(), 'src', 'prompts')
  const available = walk(dir, '.md').map((path) => relative(dir, path))
  if (!name) {
    console.log(`Prompt templates in ${PATTERNS_PKG}:\n`)
    for (const file of available) {
      console.log(
        `  ${file.replace(/\.md$/, '').padEnd(20)} pnpm ds prompts ${file.replace(/\.md$/, '')}`
      )
    }
    return
  }
  const file = available.find((entry) => entry.replace(/\.md$/, '') === name)
  if (!file) {
    console.error(
      `No prompt named "${name}".\n\nAvailable: ${available.map((entry) => entry.replace(/\.md$/, '')).join(', ')}`
    )
    process.exit(1)
  }
  console.log(readFile(join(dir, file)).trim())
}
