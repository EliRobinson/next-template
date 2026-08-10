#!/usr/bin/env node

// Prints a live inventory of the installed @elirobinson design system.
// Everything is read from node_modules at run time, so this never goes stale:
// bumping @elirobinson/react or @elirobinson/tokens is the only update needed.

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const REACT_PKG = '@elirobinson/react'
const TOKENS_PKG = '@elirobinson/tokens'

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
  const manifest = readFile(join(pkgDir, 'package.json'))
  return manifest ? JSON.parse(manifest).version : 'unknown'
}

function moduleNames(dir) {
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((file) => file.endsWith('.d.ts'))
    .map((file) => file.replace(/\.d\.ts$/, ''))
    .sort()
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

if (!reactDir || !tokensDir) {
  console.error(
    `Design system not installed. Run:\n\n  export NODE_AUTH_TOKEN=<github-pat-with-read:packages>\n  pnpm install\n\nMissing: ${[!reactDir && REACT_PKG, !tokensDir && TOKENS_PKG].filter(Boolean).join(', ')}`
  )
  process.exit(1)
}

const componentsDir = join(reactDir, 'dist', 'components')
const hooksDir = join(reactDir, 'dist', 'hooks')
const componentSrcDir = join(reactDir, 'src', 'components')
const tokensCss = readFile(join(tokensDir, 'src', 'tokens.css'))
const stylesCss = readFile(join(reactDir, 'src', 'styles.css'))

const [command = 'list', ...args] = process.argv.slice(2)

const commands = { list, tokens, classes, props }

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

Shorthand: pnpm ds Button === pnpm ds props Button`)
  process.exit(1)
}

function list() {
  console.log(
    `${REACT_PKG}@${version(reactDir)}  ${TOKENS_PKG}@${version(tokensDir)}`
  )
  console.log('Source of truth: https://github.com/EliRobinson/design-system\n')

  console.log(
    "COMPONENTS  import { X } from '@elirobinson/react/components/<Name>'"
  )
  for (const name of moduleNames(componentsDir)) {
    const declaration = readFile(join(componentsDir, `${name}.d.ts`)) ?? ''
    const exported = valueExports(declaration)
    const variants = unionTypes(declaration)
      .map(
        ({ name: type, values }) =>
          `${type.replace(name, '').toLowerCase()}: ${values.join('|')}`
      )
      .join('  ')
    console.log(
      `  ${name.padEnd(14)} ${exported.join(', ')}${variants ? `\n  ${''.padEnd(14)} ${variants}` : ''}`
    )
  }

  const hooks = moduleNames(hooksDir)
  if (hooks.length) {
    console.log("\nHOOKS  import { x } from '@elirobinson/react/hooks/<name>'")
    for (const name of hooks) console.log(`  ${name}`)
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

  console.log(
    '\nNext: `pnpm ds props <Name>` for props, `pnpm ds tokens color` for values.'
  )
}

function props(name) {
  if (!name) usage()
  const declaration = readFile(join(componentsDir, `${name}.d.ts`))
  if (!declaration) {
    const available = moduleNames(componentsDir).join(', ')
    console.error(`No component named "${name}".\n\nAvailable: ${available}`)
    process.exit(1)
  }
  console.log(`// ${REACT_PKG}/components/${name} (v${version(reactDir)})`)
  console.log(declaration.replace(/\/\/# sourceMappingURL.*\n?/, '').trim())
  const source = join(componentSrcDir, `${name}.tsx`)
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
    `\nUse as var(--token) or Tailwind arbitrary values: text-[var(--fg-2)]`
  )
}

function classes(filter) {
  const all = [...cssClasses(tokensCss), ...cssClasses(stylesCss)].filter(
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
    console.log(`  ${prefix.padEnd(20)} ${names.join(' ')}`)
  }
}
