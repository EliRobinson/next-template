#!/usr/bin/env node
// @ts-check
// Entry for the pre-PR review gate hook. See docs/agents/git-and-prs.md.
// Usage: node review-gate.mjs --agent=<claude|codex|gemini|cursor|copilot>
//
// Stdin that does not parse passes through, so a broken hook never locks an
// agent out of the shell. Once a call is known to open a PR, any error
// blocks it.

import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

import {
  REVIEWERS,
  countsAsRun,
  decidePr,
  decideReviewerStart,
  prCommandsOf,
  reviewersWithoutRun
} from './review-gate-policy.mjs'
import { quoteArgv, shellScriptOf } from './shell-parse.mjs'

/** @typedef {import('./review-gate-policy.mjs').PrCall} PrCall */
/** @typedef {import('./review-gate-policy.mjs').PrCommand} PrCommand */

/**
 * @typedef {PrCall
 *   | { kind: 'agent-start', input: Record<string, unknown> }
 *   | { kind: 'agent-stop', agent: unknown, output: unknown }
 *   | { kind: 'other' }} Call
 * @typedef {{ toCall: (event: any) => Call, deny: (message: string) => never, tracksReviewers?: boolean }} Adapter
 */

// ---- Tool adapters ----

/** @param {unknown} value */
function parseJson(value) {
  if (typeof value !== 'string') return value ?? {}
  try {
    return JSON.parse(value)
  } catch {
    return {}
  }
}

// Codex has sent shell commands as argv arrays.
/** @param {unknown} command */
function commandText(command) {
  if (typeof command === 'string') return command
  if (!Array.isArray(command)) return ''
  const argv = command.map(String)
  return shellScriptOf(argv) ?? quoteArgv(argv)
}

/**
 * @param {unknown} name
 * @param {any} input
 * @param {string[]} shellTools
 * @returns {Call}
 */
function toolCall(name, input, shellTools) {
  if (typeof name !== 'string') return { kind: 'other' }
  if (/create_pull_request/i.test(name))
    return { kind: 'mcp', input: input ?? {} }
  if (shellTools.includes(name))
    return { kind: 'shell', command: commandText(input?.command) }
  return { kind: 'other' }
}

/** @param {string} message @returns {never} */
function exitDeny(message) {
  process.stderr.write(`${message}\n`)
  process.exit(2)
}

/** @param {object} output @returns {never} */
function jsonDeny(output) {
  process.stdout.write(JSON.stringify(output))
  process.exit(0)
}

/** @type {Record<string, Adapter>} */
const ADAPTERS = {
  claude: {
    tracksReviewers: true,
    toCall(event) {
      if (event.hook_event_name === 'SubagentStop') {
        return {
          kind: 'agent-stop',
          agent: event.agent_type,
          output: event.last_assistant_message
        }
      }
      if (event.tool_name === 'Agent' || event.tool_name === 'Task') {
        return { kind: 'agent-start', input: event.tool_input ?? {} }
      }
      return toolCall(event.tool_name, event.tool_input, ['Bash'])
    },
    deny: exitDeny
  },
  codex: {
    toCall: (event) => toolCall(event.tool_name, event.tool_input, ['Bash']),
    deny: exitDeny
  },
  gemini: {
    toCall: (event) =>
      toolCall(event.tool_name, event.tool_input, ['run_shell_command']),
    deny: exitDeny
  },
  cursor: {
    toCall: (event) =>
      event.tool_name
        ? toolCall(event.tool_name, parseJson(event.tool_input), [])
        : { kind: 'shell', command: commandText(event.command) },
    deny: (message) =>
      jsonDeny({
        permission: 'deny',
        user_message: message,
        agent_message: message
      })
  },
  copilot: {
    toCall: (event) =>
      toolCall(event.toolName, parseJson(event.toolArgs), ['bash']),
    deny: (message) =>
      jsonDeny({
        permissionDecision: 'deny',
        permissionDecisionReason: message
      })
  }
}

// ---- Git ----

/** @param {string} cwd @param {string[]} args */
function tryGit(cwd, ...args) {
  try {
    return execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim()
  } catch {
    return null
  }
}

/** @param {string} cwd @param {string} ref */
function commitOf(cwd, ref) {
  return tryGit(cwd, 'rev-parse', '--verify', '--quiet', `${ref}^{commit}`)
}

/** @param {string} cwd */
function currentBranch(cwd) {
  return tryGit(cwd, 'symbolic-ref', '--quiet', '--short', 'HEAD') || null
}

// ---- Reviewer runs ----
//
// One file per reviewer, at .git/review-gate/<branch>/<agent>.json, written
// through a rename, so reviewers that finish at once do not overwrite each
// other.

/** @param {string} cwd @param {string} branch */
function runsDir(cwd, branch) {
  const gitDir = tryGit(cwd, 'rev-parse', '--git-common-dir')
  return (
    gitDir &&
    join(resolve(cwd, gitDir), 'review-gate', encodeURIComponent(branch))
  )
}

/** @param {string} cwd @param {string} branch */
function readRuns(cwd, branch) {
  const dir = runsDir(cwd, branch)
  /** @type {Record<string, { head?: string }>} */
  const runs = {}
  for (const { agent } of REVIEWERS) {
    try {
      if (dir)
        runs[agent] = JSON.parse(
          readFileSync(join(dir, `${agent}.json`), 'utf8')
        )
    } catch {
      // No run yet.
    }
  }
  return runs
}

/** @param {string} cwd @param {unknown} agent @param {unknown} output */
function recordRun(cwd, agent, output) {
  if (!countsAsRun(agent, output)) return
  const branch = currentBranch(cwd)
  const head = tryGit(cwd, 'rev-parse', 'HEAD')
  const dir = branch && runsDir(cwd, branch)
  if (!dir || !head) return
  mkdirSync(dir, { recursive: true })
  const file = join(dir, `${agent}.json`)
  const temp = `${file}.${process.pid}.tmp`
  writeFileSync(
    temp,
    `${JSON.stringify({ head, at: new Date().toISOString() }, null, 2)}\n`
  )
  renameSync(temp, file)
}

/** @param {PrCommand} pr @param {string} cwd */
function reviewersNotRun(pr, cwd) {
  const head = 'head' in pr ? pr.head?.replace(/^[^:]+:/, '') : undefined
  const branch = head ?? currentBranch(cwd)
  const base = 'base' in pr ? pr.base : undefined
  return reviewersWithoutRun(branch ? readRuns(cwd, branch) : {}, {
    head: branch && commitOf(cwd, branch),
    base:
      commitOf(cwd, `origin/${base ?? 'HEAD'}`) ?? commitOf(cwd, 'origin/main'),
    isAncestor: (commit, of) =>
      tryGit(cwd, 'merge-base', '--is-ancestor', commit, of) !== null
  })
}

// ---- Main ----

/** @param {string} path @param {string} dir */
function readFile(path, dir) {
  try {
    return readFileSync(
      resolve(dir, path.replace(/^~(?=\/|$)/, homedir())),
      'utf8'
    )
  } catch {
    return null
  }
}

/** @param {Adapter} adapter @param {string} message @returns {never} */
function block(adapter, message) {
  return adapter.deny(`Blocked by the review gate. ${message}`)
}

/** @param {PrCommand} pr @param {string} cwd @param {Adapter} adapter */
function checkPr(pr, cwd, adapter) {
  const dir = resolve(cwd, 'dir' in pr ? (pr.dir ?? '.') : '.')
  let decision
  try {
    decision = decidePr(pr, {
      readFile: (path) => readFile(path, dir),
      reviewersNotRun: () =>
        adapter.tracksReviewers ? reviewersNotRun(pr, dir) : []
    })
  } catch (error) {
    decision = {
      deny: `The hook failed: ${error instanceof Error ? error.message : error}.`
    }
  }
  if (decision) block(adapter, decision.deny)
}

function main() {
  const flag = '--agent='
  const name = (process.argv.find((arg) => arg.startsWith(flag)) ?? '').slice(
    flag.length
  )
  const adapter = ADAPTERS[name]
  if (!adapter) {
    process.stderr.write(
      `review-gate: unknown --agent "${name}". Use one of: ${Object.keys(ADAPTERS).join(', ')}.\n`
    )
    process.exit(1)
  }

  let event
  try {
    event = JSON.parse(readFileSync(0, 'utf8'))
  } catch {
    return
  }
  if (!event || typeof event !== 'object') return
  const cwd = typeof event.cwd === 'string' ? event.cwd : process.cwd()
  const call = adapter.toCall(event)

  if (call.kind === 'agent-start') {
    const decision = decideReviewerStart(call.input)
    if (decision) block(adapter, decision.deny)
  } else if (call.kind === 'agent-stop') {
    recordRun(cwd, call.agent, call.output)
  } else if (call.kind === 'shell' || call.kind === 'mcp') {
    for (const pr of prCommandsOf(call)) checkPr(pr, cwd, adapter)
  }
}

main()
