#!/usr/bin/env node
// Entry for the pre-PR review gate hook. See docs/agents/git-and-prs.md.
// Usage: node review-gate.mjs --agent=<claude|codex|gemini|cursor|copilot>
//
// Stdin that does not parse passes through, so a broken hook never locks an
// agent out of the shell. Once a call is known to open a PR, any error
// blocks it.

import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

import {
  REVIEWERS,
  decidePr,
  decideReviewerStart,
  findPrCommands
} from './review-gate-policy.mjs'

// ---- Tool adapters ----
//
// Each adapter turns its tool's stdin event into a call, and writes a denial
// in the format that tool reads. A call is one of:
//   { kind: 'shell', command, cwd }        a shell command
//   { kind: 'mcp', input, cwd }            an MCP create_pull_request call
//   { kind: 'agent-start', input, cwd }    Claude Code starting a subagent
//   { kind: 'agent-stop', agent, output, cwd }  a Claude Code subagent finished
//   { kind: 'other' }

function parseJson(value) {
  if (typeof value !== 'string') return value ?? {}
  try {
    return JSON.parse(value)
  } catch {
    return {}
  }
}

// Codex has sent shell commands as argv arrays; take the script out of
// `bash -lc <script>` or join the words.
function commandText(command) {
  if (typeof command === 'string') return command
  if (!Array.isArray(command)) return ''
  const flag = command.findIndex(
    (arg, i) => i > 0 && /^-[a-z]*c[a-z]*$/.test(arg)
  )
  return flag !== -1 && command[flag + 1] !== undefined
    ? command[flag + 1]
    : command.join(' ')
}

function toolCall(name, input, cwd, shellNames) {
  if (/create_pull_request/i.test(name ?? ''))
    return { kind: 'mcp', input: input ?? {}, cwd }
  if (shellNames.includes(name))
    return { kind: 'shell', command: commandText(input?.command), cwd }
  return { kind: 'other' }
}

function exitDeny(message) {
  process.stderr.write(`${message}\n`)
  process.exit(2)
}

function jsonDeny(output) {
  process.stdout.write(JSON.stringify(output))
  process.exit(0)
}

const ADAPTERS = {
  claude: {
    tracksReviewers: true,
    toCall(event) {
      if (event.hook_event_name === 'SubagentStop') {
        return {
          kind: 'agent-stop',
          agent: event.agent_type,
          output: event.last_assistant_message,
          cwd: event.cwd
        }
      }
      if (event.tool_name === 'Agent' || event.tool_name === 'Task') {
        return {
          kind: 'agent-start',
          input: event.tool_input ?? {},
          cwd: event.cwd
        }
      }
      return toolCall(event.tool_name, event.tool_input, event.cwd, ['Bash'])
    },
    deny: exitDeny
  },
  codex: {
    toCall: (event) =>
      toolCall(event.tool_name, event.tool_input, event.cwd, ['Bash']),
    deny: exitDeny
  },
  gemini: {
    toCall: (event) =>
      toolCall(event.tool_name, event.tool_input, event.cwd, [
        'run_shell_command'
      ]),
    deny: exitDeny
  },
  cursor: {
    toCall(event) {
      if (event.tool_name) {
        return toolCall(
          event.tool_name,
          parseJson(event.tool_input),
          event.cwd,
          []
        )
      }
      return {
        kind: 'shell',
        command: commandText(event.command),
        cwd: event.cwd
      }
    },
    deny: (message) =>
      jsonDeny({
        permission: 'deny',
        user_message: message,
        agent_message: message
      })
  },
  copilot: {
    toCall: (event) =>
      toolCall(event.toolName, parseJson(event.toolArgs), event.cwd, ['bash']),
    deny: (message) =>
      jsonDeny({
        permissionDecision: 'deny',
        permissionDecisionReason: message
      })
  }
}

// ---- Git and reviewer runs ----

function git(cwd, ...args) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore']
  }).trim()
}

function tryGit(cwd, ...args) {
  try {
    return git(cwd, ...args)
  } catch {
    return null
  }
}

function isAncestor(cwd, commit, of) {
  return tryGit(cwd, 'merge-base', '--is-ancestor', commit, of) !== null
}

function currentBranch(cwd) {
  const branch = tryGit(cwd, 'symbolic-ref', '--quiet', '--short', 'HEAD')
  return branch || null
}

function runsFile(cwd, branch) {
  const gitDir = resolve(cwd, git(cwd, 'rev-parse', '--git-common-dir'))
  return join(gitDir, 'review-gate', `${encodeURIComponent(branch)}.json`)
}

function readRuns(cwd, branch) {
  try {
    return JSON.parse(readFileSync(runsFile(cwd, branch), 'utf8'))
  } catch {
    return {}
  }
}

// Records a reviewer when it finishes with a report. A reviewer that errors
// out or returns nothing does not count.
function recordRun({ agent, output, cwd }) {
  if (!REVIEWERS.some((reviewer) => reviewer.agent === agent)) return
  if (typeof output !== 'string' || output.trim() === '') return
  const branch = currentBranch(cwd)
  const head = tryGit(cwd, 'rev-parse', 'HEAD')
  if (!branch || !head) return
  const file = runsFile(cwd, branch)
  const runs = readRuns(cwd, branch)
  runs[agent] = { head, at: new Date().toISOString() }
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, `${JSON.stringify(runs, null, 2)}\n`)
}

// A run counts when its commit is on the PR branch and newer than the base.
// Fix commits made after the review still count.
function reviewersNotRun(pr, cwd) {
  const all = REVIEWERS.map(({ agent }) => agent)
  const branch = pr.head?.replace(/^[^:]+:/, '') ?? currentBranch(cwd)
  const head =
    branch &&
    tryGit(cwd, 'rev-parse', '--verify', '--quiet', `${branch}^{commit}`)
  if (!branch || !head) return all
  const base =
    tryGit(
      cwd,
      'rev-parse',
      '--verify',
      '--quiet',
      `origin/${pr.base ?? 'HEAD'}^{commit}`
    ) ?? tryGit(cwd, 'rev-parse', '--verify', '--quiet', 'origin/main^{commit}')
  const runs = readRuns(cwd, branch)
  return all.filter((agent) => {
    const run = runs[agent]
    if (!run?.head || !isAncestor(cwd, run.head, head)) return true
    return base !== null && run.head !== head && isAncestor(cwd, run.head, base)
  })
}

// ---- Body files ----

function bodyOf(pr, cwd) {
  const path = pr.bodyFile.replace(/^~(?=\/|$)/, homedir())
  try {
    return readFileSync(resolve(cwd, path), 'utf8')
  } catch {
    return { missing: pr.bodyFile }
  }
}

// ---- Main ----

function checkPr(pr, call, adapter) {
  let decision
  try {
    decision = decidePr(pr, {
      bodyOf: (command) => bodyOf(command, call.cwd),
      reviewersNotRun: (command) =>
        adapter.tracksReviewers ? reviewersNotRun(command, call.cwd) : null
    })
  } catch (error) {
    decision = { deny: `The review gate hook failed: ${error.message}` }
  }
  if (decision) adapter.deny(`Blocked by the review gate. ${decision.deny}`)
}

function main() {
  const name = (
    process.argv.find((arg) => arg.startsWith('--agent=')) ?? ''
  ).slice(8)
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
  const call = adapter.toCall(event)
  call.cwd ??= process.cwd()

  if (call.kind === 'agent-start') {
    const decision = decideReviewerStart(call.input)
    if (decision) adapter.deny(`Blocked by the review gate. ${decision.deny}`)
  } else if (call.kind === 'agent-stop') {
    try {
      recordRun(call)
    } catch {
      // The PR check reports the missing run.
    }
  } else if (call.kind === 'mcp') {
    const { body, head, base } = call.input
    checkPr(
      { kind: 'mcp-create', body: String(body ?? ''), head, base },
      call,
      adapter
    )
  } else if (call.kind === 'shell') {
    let prs
    try {
      prs = findPrCommands(call.command)
    } catch {
      if (/\bgh\b[\s\S]*\b(pr|api)\b/.test(call.command)) {
        adapter.deny(
          'Blocked by the review gate. The hook could not parse this `gh` command.'
        )
      }
      return
    }
    for (const pr of prs) checkPr(pr, call, adapter)
  }
}

main()
