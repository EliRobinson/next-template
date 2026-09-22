// @ts-check
// Rules for the pre-PR review gate. See docs/agents/git-and-prs.md.
// No I/O: the entry script (review-gate.mjs) reads files and git and passes
// the results in, so every rule here is unit-tested.

import { posix } from 'node:path'

import { basename, parseCommands } from './shell-parse.mjs'

/** The reviewers, in the order the PR template lists them. */
export const REVIEWERS = /** @type {const} */ ([
  { agent: 'review-code-quality', label: 'Code quality' },
  { agent: 'review-correctness', label: 'Correctness' },
  { agent: 'review-spec', label: 'Spec, security, copy' },
  { agent: 'review-dry', label: 'DRY' }
])

/** @typedef {(typeof REVIEWERS)[number]['agent']} ReviewerAgent */

/**
 * A call that opens a PR. `dir` is where a leading `cd` moved the shell,
 * relative to the hook's working directory.
 * @typedef {{ kind: 'pr-create', bodyFile?: string, fill: boolean, web: boolean, head?: string, base?: string, dir?: string }
 *   | { kind: 'mcp-create', body: string, head?: string, base?: string }
 *   | { kind: 'api-create' }
 *   | { kind: 'graphql-files', files: string[], dir?: string }} PrCommand
 */

/**
 * A tool call, as an adapter in review-gate.mjs reads it.
 * @typedef {{ kind: 'shell', command: string }
 *   | { kind: 'mcp', input: Record<string, unknown> }} PrCall
 */

/** @typedef {{ deny: string } | null} Decision */

// ---- Flags ----

/**
 * Reads flags from argv. `--flag=value`, `-fvalue`, and `-f value` all
 * work for flags in `valueFlags`. `--flag=false` counts as not set.
 * @param {string[]} args
 * @param {Set<string>} valueFlags
 */
function readFlags(args, valueFlags) {
  /** @type {Map<string, string[]>} */
  const flags = new Map()
  /** @type {string[]} */
  const positional = []
  const add = (/** @type {string} */ name, /** @type {string} */ value) => {
    flags.set(name, [...(flags.get(name) ?? []), value])
  }
  for (let i = 0; i < args.length; i++) {
    const arg = args[i] ?? ''
    const eq = arg.startsWith('--') ? arg.indexOf('=') : -1
    if (eq !== -1) {
      const value = arg.slice(eq + 1)
      if (!/^(false|0)$/i.test(value)) add(arg.slice(0, eq), value)
    } else if (valueFlags.has(arg)) {
      add(arg, args[++i] ?? '')
    } else if (
      /^-[^-]/.test(arg) &&
      arg.length > 2 &&
      valueFlags.has(arg.slice(0, 2))
    ) {
      add(arg.slice(0, 2), arg.slice(2))
    } else if (arg.startsWith('-') && arg !== '-') {
      add(arg, 'true')
    } else {
      positional.push(arg)
    }
  }
  const all = (/** @type {string[]} */ ...names) =>
    names.flatMap((name) => flags.get(name) ?? [])
  return {
    all,
    has: (/** @type {string[]} */ ...names) => all(...names).length > 0,
    positional
  }
}

// ---- gh commands ----

const PR_CREATE_VALUE_FLAGS = new Set(
  'title body body-file base head assignee label milestone project reviewer repo template recover'
    .split(' ')
    .map((name) => `--${name}`)
    .concat([
      '-t',
      '-b',
      '-F',
      '-B',
      '-H',
      '-a',
      '-l',
      '-m',
      '-p',
      '-r',
      '-R',
      '-T'
    ])
)
const PR_GROUP_VALUE_FLAGS = new Set(['-R', '--repo'])

/**
 * @param {string[]} args  argv after `gh pr create`
 * @param {string | undefined} dir
 * @returns {PrCommand | null}
 */
function classifyPrCreate(args, dir) {
  const { all, has } = readFlags(args, PR_CREATE_VALUE_FLAGS)
  if (has('-h', '--help', '--dry-run')) return null
  return {
    kind: 'pr-create',
    bodyFile: all('-F', '--body-file').at(-1),
    fill: has('-f', '--fill', '--fill-first', '--fill-verbose'),
    web: has('-w', '--web'),
    head: all('-H', '--head').at(-1),
    base: all('-B', '--base').at(-1),
    dir
  }
}

const API_VALUE_FLAGS = new Set(
  'method raw-field field header input jq template cache preview hostname'
    .split(' ')
    .map((name) => `--${name}`)
    .concat(['-X', '-f', '-F', '-H', '-q', '-t', '-p'])
)
const PULLS_ENDPOINT = /^\/?repos\/[^/]+\/[^/]+\/pulls\/?(\?.*)?$/

/**
 * @param {string[]} args  argv after `gh api`
 * @param {string | undefined} dir
 * @returns {PrCommand | null}
 */
function classifyApi(args, dir) {
  const { all, positional } = readFlags(args, API_VALUE_FLAGS)
  const endpoint = positional[0] ?? ''
  const fields = all('-f', '--raw-field', '-F', '--field')
  const inputs = all('--input')
  const method = (
    all('-X', '--method').at(-1) ??
    (fields.length + inputs.length > 0 ? 'POST' : 'GET')
  ).toUpperCase()

  if (endpoint === 'graphql') {
    if (fields.some((field) => field.includes('createPullRequest')))
      return { kind: 'api-create' }
    const files = [
      ...fields.flatMap((field) => /^[^=]+=@(.+)$/.exec(field)?.[1] ?? []),
      ...inputs
    ]
    return files.length > 0 ? { kind: 'graphql-files', files, dir } : null
  }
  return PULLS_ENDPOINT.test(endpoint) && method === 'POST'
    ? { kind: 'api-create' }
    : null
}

/**
 * The PR-opening commands in a shell script, if any.
 * @param {string} script
 * @returns {PrCommand[]}
 */
export function findPrCommands(script) {
  /** @type {PrCommand[]} */
  const found = []
  /** @type {string | undefined} */
  let dir
  for (const argv of parseCommands(script)) {
    const [name, group, ...rest] = argv
    if (name === 'cd') {
      const target = group ?? '~'
      dir = /[$~`]/.test(target) ? undefined : posix.join(dir ?? '.', target)
      continue
    }
    if (basename(name ?? '') !== 'gh') continue
    if (group === 'pr') {
      const sub = readFlags(rest, PR_GROUP_VALUE_FLAGS).positional[0]
      if (sub === 'create' || sub === 'new') {
        const pr = classifyPrCreate(rest.slice(rest.indexOf(sub) + 1), dir)
        if (pr) found.push(pr)
      }
    } else if (group === 'api') {
      const api = classifyApi(rest, dir)
      if (api) found.push(api)
    }
  }
  return found
}

/**
 * The PR-opening commands in a tool call.
 * @param {PrCall} call
 * @returns {PrCommand[]}
 */
export function prCommandsOf(call) {
  if (call.kind === 'shell') return findPrCommands(call.command)
  const text = (/** @type {unknown} */ value) =>
    typeof value === 'string' ? value : undefined
  return [
    {
      kind: 'mcp-create',
      body: text(call.input.body) ?? '',
      head: text(call.input.head),
      base: text(call.input.base)
    }
  ]
}

// ---- Review section ----

/**
 * The reviewer labels whose `**Label:**` line under `## Review` is missing
 * or empty. Null when the body has no `## Review` section at all.
 * @param {string} markdown
 * @returns {string[] | null}
 */
export function unfilledReviewLabels(markdown) {
  const lines = markdown
    .replace(/\r/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .split('\n')
  const start = lines.findIndex((line) => /^##\s+Review\s*$/.test(line.trim()))
  if (start === -1) return null
  const end = lines.findIndex(
    (line, i) => i > start && /^##\s/.test(line.trim())
  )
  const section = lines.slice(start + 1, end === -1 ? undefined : end)

  return REVIEWERS.filter(({ label }) => {
    const prefix = `**${label}:**`
    const line = section.find((candidate) => candidate.includes(prefix))
    return (
      !line || line.slice(line.indexOf(prefix) + prefix.length).trim() === ''
    )
  }).map(({ label }) => label)
}

// ---- Reviewer runs ----

/**
 * Whether a finished subagent counts as a reviewer run: it is a reviewer,
 * and it returned a report.
 * @param {unknown} agent
 * @param {unknown} output
 * @returns {agent is ReviewerAgent}
 */
export function countsAsRun(agent, output) {
  return (
    REVIEWERS.some((reviewer) => reviewer.agent === agent) &&
    typeof output === 'string' &&
    output.trim() !== ''
  )
}

/**
 * The reviewers with no run that counts for this PR. A run counts when the
 * commit it reviewed is on the PR branch and not already on the base. Fix
 * commits made after the review still count; amending, squashing, or
 * rebasing past the reviewed commit does not.
 * @param {Partial<Record<ReviewerAgent, { head?: string }>>} runs
 * @param {{ head: string | null, base: string | null, isAncestor: (commit: string, of: string) => boolean }} branch
 * @returns {ReviewerAgent[]}
 */
export function reviewersWithoutRun(runs, { head, base, isAncestor }) {
  return REVIEWERS.map(({ agent }) => agent).filter((agent) => {
    const reviewed = runs[agent]?.head
    if (!head || !reviewed) return true
    const onBranch = isAncestor(reviewed, head)
    const onlyBase = base !== null && isAncestor(reviewed, base)
    return !onBranch || onlyBase
  })
}

// ---- Decisions ----

const REVIEW_FORMAT =
  'The PR body needs a "## Review" section with one filled line per reviewer, as in .github/pull_request_template.md.'

/**
 * Decides a PR-opening command. `readFile` resolves paths from the PR
 * command's directory and returns null for a missing file. Tools that do
 * not track reviewer runs pass `reviewersNotRun: () => []`.
 * @param {PrCommand} pr
 * @param {{ readFile: (path: string) => string | null, reviewersNotRun: () => string[] }} deps
 * @returns {Decision}
 */
export function decidePr(pr, { readFile, reviewersNotRun }) {
  if (pr.kind === 'api-create') {
    return { deny: 'Open PRs with `gh pr create --body-file`, not `gh api`.' }
  }
  if (pr.kind === 'graphql-files') {
    const creates = pr.files.some((file) =>
      readFile(file)?.includes('createPullRequest')
    )
    return creates
      ? {
          deny: 'Open PRs with `gh pr create --body-file`, not a GraphQL mutation.'
        }
      : null
  }

  let body
  if (pr.kind === 'mcp-create') {
    body = pr.body
  } else if (pr.fill || pr.web) {
    return {
      deny: 'The hook cannot read a body from `--fill` or `--web`. Use `--body-file`.'
    }
  } else if (!pr.bodyFile || pr.bodyFile === '-') {
    return {
      deny: 'Write the PR body to a file first, in its own step. Then run `gh pr create --body-file <path>`.'
    }
  } else {
    body = readFile(pr.bodyFile)
    if (body === null) {
      return {
        deny: `The body file \`${pr.bodyFile}\` does not exist. Write it in its own step before \`gh pr create\`.`
      }
    }
  }

  const notRun = reviewersNotRun()
  if (notRun.length > 0) {
    return {
      deny: `These reviewers have no run on this branch: ${notRun.join(', ')}. Start each with the Agent tool, subagent_type set to its name and no model.`
    }
  }

  const unfilled = unfilledReviewLabels(body)
  if (unfilled === null) {
    return { deny: `The PR body has no "## Review" section. ${REVIEW_FORMAT}` }
  }
  if (unfilled.length > 0) {
    return {
      deny: `The Review section has no filled line for: ${unfilled.join(', ')}. ${REVIEW_FORMAT}`
    }
  }
  return null
}

/**
 * Decides a Claude Code Agent-tool call that starts a subagent.
 * @param {{ subagent_type?: unknown, model?: unknown }} input
 * @returns {Decision}
 */
export function decideReviewerStart(input) {
  const reviewer = REVIEWERS.find(({ agent }) => agent === input.subagent_type)
  if (!reviewer || !input.model) return null
  return {
    deny: `Start ${reviewer.agent} without a \`model\` parameter. Its model is pinned in .claude/agents/${reviewer.agent}.md.`
  }
}
