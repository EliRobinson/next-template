// Pure policy for the pre-PR review gate. See docs/agents/git-and-prs.md.
// No I/O: the entry script (review-gate.mjs) reads files and git and passes
// the results in, so every rule here is unit-tested.

export const REVIEWERS = [
  { agent: 'review-code-quality', label: 'Code quality' },
  { agent: 'review-correctness', label: 'Correctness' },
  { agent: 'review-spec', label: 'Spec, security, copy' },
  { agent: 'review-dry', label: 'DRY' }
]

export const PLACEHOLDER = 'fixed / declined (why) / filed (issue link)'

// ---- Shell parsing ----
//
// A small parser, not a full shell. It finds every simple command in a
// script, including ones inside `$(...)`, backticks, `bash -c`, and `eval`,
// and ignores text inside quotes and heredoc bodies.

const HEREDOC_START = /<<-?\s*(['"]?)([A-Za-z_][\w-]*)\1/g

export function stripHeredocBodies(script) {
  const out = []
  const pending = []
  for (const line of script.split('\n')) {
    if (pending.length > 0) {
      if (line.trim() === pending[0]) pending.shift()
      out.push('')
      continue
    }
    out.push(line)
    for (const match of line.matchAll(HEREDOC_START)) pending.push(match[2])
  }
  return out.join('\n')
}

// Reads the `$(...)` body starting at `start` (just past the `(`). Returns
// the body text and the index just past the closing `)`.
function readSubstitution(text, start) {
  let depth = 1
  let quote = null
  for (let i = start; i < text.length; i++) {
    const ch = text[i]
    if (quote) {
      if (ch === '\\' && quote === '"') i++
      else if (ch === quote) quote = null
      continue
    }
    if (ch === '\\') i++
    else if (ch === "'" || ch === '"') quote = ch
    else if (ch === '(') depth++
    else if (ch === ')' && --depth === 0)
      return { body: text.slice(start, i), end: i + 1 }
  }
  return { body: text.slice(start), end: text.length }
}

const OPERATORS = ['&&', '||', ';;', '|&', ';', '|', '&', '(', ')', '\n']

// Splits a script into tokens: { word } or { op }. Nested scripts from
// `$(...)` and backticks go into `nested`.
function tokenize(script, nested) {
  const tokens = []
  let word = null
  const endWord = () => {
    if (word !== null) tokens.push({ word })
    word = null
  }
  for (let i = 0; i < script.length; i++) {
    const ch = script[i]
    if (ch === ' ' || ch === '\t') {
      endWord()
    } else if (ch === '#' && word === null) {
      while (i + 1 < script.length && script[i + 1] !== '\n') i++
    } else if (ch === '\\') {
      if (script[i + 1] !== '\n') word = (word ?? '') + (script[i + 1] ?? '')
      i++
    } else if (ch === "'") {
      const end = script.indexOf("'", i + 1)
      const close = end === -1 ? script.length : end
      word = (word ?? '') + script.slice(i + 1, close)
      i = close
    } else if (ch === '"') {
      let value = ''
      for (i++; i < script.length && script[i] !== '"'; i++) {
        if (script[i] === '\\') {
          value += script[++i] ?? ''
        } else if (script[i] === '$' && script[i + 1] === '(') {
          const { body, end } = readSubstitution(script, i + 2)
          nested.push(body)
          value += `$(${body})`
          i = end - 1
        } else if (script[i] === '`') {
          const end = script.indexOf('`', i + 1)
          const close = end === -1 ? script.length : end
          nested.push(script.slice(i + 1, close))
          i = close
        } else {
          value += script[i]
        }
      }
      word = (word ?? '') + value
    } else if (ch === '$' && script[i + 1] === '(') {
      const { body, end } = readSubstitution(script, i + 2)
      nested.push(body)
      word = (word ?? '') + `$(${body})`
      i = end - 1
    } else if (ch === '`') {
      const end = script.indexOf('`', i + 1)
      const close = end === -1 ? script.length : end
      nested.push(script.slice(i + 1, close))
      i = close
    } else if (ch === '<' || ch === '>') {
      endWord()
      while (
        script[i + 1] === '<' ||
        script[i + 1] === '>' ||
        script[i + 1] === '&'
      )
        i++
      tokens.push({ op: 'redirect' })
    } else {
      const op = OPERATORS.find((candidate) => script.startsWith(candidate, i))
      if (op) {
        endWord()
        tokens.push({ op })
        i += op.length - 1
      } else {
        word = (word ?? '') + ch
      }
    }
  }
  endWord()
  return tokens
}

const KEYWORDS = new Set([
  'if',
  'then',
  'else',
  'elif',
  'do',
  'while',
  'until',
  '!',
  '{',
  '}',
  'time'
])
const WRAPPERS = new Set([
  'command',
  'builtin',
  'exec',
  'nohup',
  'sudo',
  'env',
  'nice',
  'xargs'
])
const SHELLS = new Set(['sh', 'bash', 'zsh', 'dash', 'ksh'])
const ASSIGNMENT = /^[A-Za-z_]\w*=/

function basename(path) {
  return path.slice(path.lastIndexOf('/') + 1)
}

// Drops env assignments, shell keywords, and wrapper commands (with their
// flags) from the front of a command.
function unwrap(argv) {
  let rest = argv
  for (;;) {
    const [first] = rest
    if (first === undefined) return rest
    if (ASSIGNMENT.test(first) || KEYWORDS.has(first)) {
      rest = rest.slice(1)
    } else if (WRAPPERS.has(basename(first))) {
      rest = rest.slice(1)
      while (rest[0]?.startsWith('-')) rest = rest.slice(1)
    } else {
      return rest
    }
  }
}

// Every simple command in the script, as an argv array.
export function parseCommands(script, depth = 0) {
  if (depth > 5) return []
  const nested = []
  const tokens = tokenize(stripHeredocBodies(script), nested)
  const commands = []
  let argv = []
  let skipNext = false
  const flush = () => {
    const command = unwrap(argv)
    if (command.length > 0) commands.push(command)
    argv = []
  }
  for (const token of tokens) {
    if (token.op === 'redirect') {
      skipNext = true
    } else if (token.op) {
      flush()
    } else if (skipNext) {
      skipNext = false
    } else {
      argv.push(token.word)
    }
  }
  flush()

  const inner = []
  for (const command of commands) {
    const name = basename(command[0])
    if (SHELLS.has(name)) {
      const flag = command.findIndex(
        (arg, i) => i > 0 && /^-[a-z]*c[a-z]*$/.test(arg)
      )
      if (flag !== -1 && command[flag + 1] !== undefined) {
        inner.push(...parseCommands(command[flag + 1], depth + 1))
      }
    } else if (name === 'eval') {
      inner.push(...parseCommands(command.slice(1).join(' '), depth + 1))
    }
  }
  for (const body of nested) inner.push(...parseCommands(body, depth + 1))
  return [...commands, ...inner]
}

// ---- gh commands ----

const PR_CREATE_VALUE_FLAGS = new Set([
  '-t',
  '--title',
  '-b',
  '--body',
  '-F',
  '--body-file',
  '-B',
  '--base',
  '-H',
  '--head',
  '-a',
  '--assignee',
  '-l',
  '--label',
  '-m',
  '--milestone',
  '-p',
  '--project',
  '-r',
  '--reviewer',
  '-R',
  '--repo',
  '-T',
  '--template',
  '--recover'
])

function readFlags(args, valueFlags) {
  const flags = new Map()
  const positional = []
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    const eq = arg.startsWith('--') ? arg.indexOf('=') : -1
    if (eq !== -1) {
      flags.set(arg.slice(0, eq), [
        ...(flags.get(arg.slice(0, eq)) ?? []),
        arg.slice(eq + 1)
      ])
    } else if (valueFlags.has(arg)) {
      flags.set(arg, [...(flags.get(arg) ?? []), args[++i] ?? ''])
    } else if (arg.startsWith('-') && arg !== '-') {
      flags.set(arg, [...(flags.get(arg) ?? []), true])
    } else {
      positional.push(arg)
    }
  }
  const get = (...names) => names.flatMap((name) => flags.get(name) ?? [])
  return { get, positional }
}

function classifyPrCreate(args) {
  const { get } = readFlags(args, PR_CREATE_VALUE_FLAGS)
  if (get('-h', '--help', '--dry-run').length > 0) return null
  return {
    kind: 'pr-create',
    bodyFile: get('-F', '--body-file').at(-1),
    inlineBody: get('-b', '--body').length > 0,
    fill: get('-f', '--fill', '--fill-first', '--fill-verbose').length > 0,
    web: get('-w', '--web').length > 0,
    head: get('-H', '--head').at(-1),
    base: get('-B', '--base').at(-1)
  }
}

const API_VALUE_FLAGS = new Set([
  '-X',
  '--method',
  '-f',
  '--raw-field',
  '-F',
  '--field',
  '-H',
  '--header',
  '--input',
  '-q',
  '--jq',
  '-t',
  '--template',
  '--cache',
  '-p',
  '--preview',
  '--hostname'
])

const PULLS_ENDPOINT = /^\/?repos\/[^/]+\/[^/]+\/pulls\/?(\?.*)?$/

function classifyApi(args) {
  const { get, positional } = readFlags(args, API_VALUE_FLAGS)
  const endpoint = positional[0] ?? ''
  const fields = get('-f', '--raw-field', '-F', '--field')
  const hasBody = fields.length > 0 || get('--input').length > 0
  const method = String(
    get('-X', '--method').at(-1) ?? (hasBody ? 'POST' : 'GET')
  ).toUpperCase()
  if (
    endpoint === 'graphql' &&
    fields.some((field) => /createPullRequest/.test(String(field)))
  ) {
    return { kind: 'api-create' }
  }
  if (PULLS_ENDPOINT.test(endpoint) && method === 'POST')
    return { kind: 'api-create' }
  return null
}

// The PR-opening commands in a shell script, if any.
export function findPrCommands(script) {
  const found = []
  for (const argv of parseCommands(script)) {
    if (basename(argv[0]) !== 'gh') continue
    const [group, sub, ...rest] = argv.slice(1)
    if (group === 'pr' && (sub === 'create' || sub === 'new')) {
      const pr = classifyPrCreate(rest)
      if (pr) found.push(pr)
    } else if (group === 'api') {
      const api = classifyApi(argv.slice(2))
      if (api) found.push(api)
    }
  }
  return found
}

// ---- Review section ----

// Returns the reviewer labels whose `**Label:**` line under `## Review` is
// missing, empty, or still the placeholder. Null when the body has no
// `## Review` section at all.
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
    if (!line) return true
    const value = line.slice(line.indexOf(prefix) + prefix.length).trim()
    return value === '' || value === PLACEHOLDER
  }).map(({ label }) => label)
}

// ---- Decisions ----

const REVIEW_FORMAT =
  'The PR body needs a "## Review" section with one filled line per reviewer, as in .github/pull_request_template.md.'

// Decides a PR-opening call. `bodyOf(pr)` returns the body file's text, or
// { missing: path } when the file does not exist. `reviewersNotRun(pr)`
// returns the reviewer agents that have not run on the PR's branch, or null
// when this tool does not track reviewer runs.
export function decidePr(pr, { bodyOf, reviewersNotRun }) {
  if (pr.kind === 'api-create') {
    return { deny: 'Open PRs with `gh pr create --body-file`, not `gh api`.' }
  }
  if (pr.kind === 'mcp-create') return decideBody(pr, pr.body, reviewersNotRun)
  if (pr.fill || pr.web) {
    return {
      deny: 'The hook cannot read a body from `--fill` or `--web`. Use `--body-file`.'
    }
  }
  if (!pr.bodyFile || pr.bodyFile === '-') {
    return {
      deny: 'Write the PR body to a file first, in its own step. Then run `gh pr create --body-file <path>`.'
    }
  }
  const body = bodyOf(pr)
  if (typeof body !== 'string') {
    return {
      deny: `The body file \`${body.missing}\` does not exist. Write it in its own step before \`gh pr create\`.`
    }
  }

  return decideBody(pr, body, reviewersNotRun)
}

function decideBody(pr, body, reviewersNotRun) {
  const notRun = reviewersNotRun(pr)
  if (notRun && notRun.length > 0) {
    return {
      deny: `These reviewers have not run on this branch's commits: ${notRun.join(', ')}. Start each with the Agent tool, subagent_type set to its name and no model.`
    }
  }

  const unfilled = unfilledReviewLabels(body)
  if (unfilled === null)
    return { deny: `The PR body has no "## Review" section. ${REVIEW_FORMAT}` }
  if (unfilled.length > 0) {
    return {
      deny: `The Review section has no filled line for: ${unfilled.join(', ')}. ${REVIEW_FORMAT}`
    }
  }
  return null
}

// Decides a Claude Code Agent-tool call that starts a subagent.
export function decideReviewerStart(input) {
  const reviewer = REVIEWERS.find(({ agent }) => agent === input.subagent_type)
  if (!reviewer || !input.model) return null
  return {
    deny: `Start ${reviewer.agent} without a \`model\` parameter. Its model is pinned in .claude/agents/${reviewer.agent}.md.`
  }
}
