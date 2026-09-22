#!/usr/bin/env node
// Pre-PR review gate for AI agents. See docs/agents/git-and-prs.md.
//
// Runs as a pre-tool hook in Claude Code, Codex, Gemini CLI, Cursor, and
// GitHub Copilot. Pass the tool as `--agent=<name>`; it picks the input and
// output format. The hook reads the tool call as JSON on stdin and:
//
// - blocks a PR (`gh pr create`, `gh api .../pulls`, an MCP
//   `create_pull_request` tool) unless the body has a `## Review` section with
//   a filled line for each reviewer;
// - in Claude Code only, also blocks the PR until all four reviewer agents in
//   `.claude/agents/` have run on the branch, and blocks a reviewer started
//   with a model override, so each reviewer runs on the model its file pins.
//
// Every other tool call passes through. Bad input passes through too, so a
// broken hook never locks an agent out of the shell.

import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const REVIEWERS = [
  { agent: 'review-code-quality', label: 'Code quality' },
  { agent: 'review-correctness', label: 'Correctness' },
  { agent: 'review-spec', label: 'Spec, security, copy' },
  { agent: 'review-dry', label: 'DRY' }
]

const GATE_DOC = 'docs/agents/git-and-prs.md#review-gate-before-a-pr-is-opened'

const agent = (
  process.argv.find((arg) => arg.startsWith('--agent=')) ?? '--agent=claude'
).slice('--agent='.length)

function readStdin() {
  try {
    return JSON.parse(readFileSync(0, 'utf8'))
  } catch {
    return null
  }
}

// One shape for every tool: { toolName, input, cwd }.
function normalize(event) {
  if (!event || typeof event !== 'object') return null
  const cwd = event.cwd ?? process.cwd()
  if (agent === 'cursor') {
    return { toolName: 'shell', input: { command: event.command }, cwd }
  }
  if (agent === 'copilot') {
    let input = event.toolArgs
    try {
      if (typeof input === 'string') input = JSON.parse(input)
    } catch {
      input = {}
    }
    return { toolName: event.toolName ?? '', input: input ?? {}, cwd }
  }
  return { toolName: event.tool_name ?? '', input: event.tool_input ?? {}, cwd }
}

function allow() {
  process.exit(0)
}

function deny(reason) {
  const message =
    `Blocked by the review gate. ${reason}\n` +
    `See ${GATE_DOC}.\n` +
    `The PR body needs a "## Review" section with one filled line per reviewer:\n` +
    REVIEWERS.map(
      ({ label }) =>
        `- **${label}:** fixed / declined (why) / filed (issue link)`
    ).join('\n') +
    '\n'
  if (agent === 'cursor') {
    process.stdout.write(
      JSON.stringify({
        permission: 'deny',
        user_message: reason,
        agent_message: message
      })
    )
    process.exit(0)
  }
  if (agent === 'copilot') {
    process.stdout.write(
      JSON.stringify({
        permissionDecision: 'deny',
        permissionDecisionReason: message
      })
    )
    process.exit(0)
  }
  process.stderr.write(message)
  process.exit(2)
}

// ---- Reviewer runs (Claude Code) ----

function git(cwd, ...args) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore']
  })
    .toString()
    .trim()
}

function runsFile(cwd) {
  const gitDir = resolve(cwd, git(cwd, 'rev-parse', '--git-common-dir'))
  const branch = git(cwd, 'rev-parse', '--abbrev-ref', 'HEAD').replace(
    /[^\w.-]/g,
    '_'
  )
  return join(gitDir, 'review-gate', `${branch}.json`)
}

function readRuns(cwd) {
  try {
    return JSON.parse(readFileSync(runsFile(cwd), 'utf8'))
  } catch {
    return {}
  }
}

function recordRun(cwd, reviewer) {
  try {
    const file = runsFile(cwd)
    mkdirSync(join(file, '..'), { recursive: true })
    const runs = readRuns(cwd)
    runs[reviewer] = {
      head: git(cwd, 'rev-parse', 'HEAD'),
      at: new Date().toISOString()
    }
    writeFileSync(file, JSON.stringify(runs, null, 2) + '\n')
  } catch {
    // Not a git repo: nothing to record, and the PR check will say so.
  }
}

function checkReviewerStart({ input, cwd }) {
  const reviewer = REVIEWERS.find(
    ({ agent: name }) => name === input.subagent_type
  )
  if (!reviewer) allow()
  if (input.model) {
    deny(
      `Start ${reviewer.agent} without a \`model\` parameter. Its model is pinned in .claude/agents/${reviewer.agent}.md.`
    )
  }
  recordRun(cwd, reviewer.agent)
  allow()
}

// ---- PR body ----

// Returns the text to search for the Review section, or null when the call
// does not open a PR.
function prBodyText({ toolName, input, cwd }) {
  if (/create_pull_request/i.test(toolName)) {
    return String(input.body ?? '')
  }

  const command = typeof input.command === 'string' ? input.command : ''
  // `gh` must start a command, so a PR command quoted inside another command
  // (a test, a grep) does not trip the gate.
  const atCommandStart = '(?:^|[;&|(\\n])\\s*'
  if (
    new RegExp(`${atCommandStart}gh\\s+api\\b[^\\n]*\\/pulls\\b`).test(
      command
    ) &&
    !/\/pulls\/\d/.test(command)
  ) {
    deny('Open PRs with `gh pr create`, not `gh api .../pulls`.')
  }
  if (!new RegExp(`${atCommandStart}gh\\s+pr\\s+create\\b`).test(command))
    return null

  if (/\s--(fill|fill-first|fill-verbose|web)\b/.test(command)) {
    deny(
      'Pass the PR body with `--body` or `--body-file`, not `--fill` or `--web`.'
    )
  }

  let text = command
  const bodyFile = command.match(
    /(?:--body-file|-F)[=\s]+("([^"]+)"|'([^']+)'|(\S+))/
  )
  if (bodyFile) {
    const path = bodyFile[2] ?? bodyFile[3] ?? bodyFile[4]
    try {
      text += '\n' + readFileSync(resolve(cwd, path), 'utf8')
    } catch {
      deny(`Cannot read the PR body file \`${path}\`.`)
    }
  }
  return text
}

// Lines under `## Review`, up to the next `## ` heading or heredoc end.
function reviewSection(text) {
  const lines = text
    .replace(/\r/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .split('\n')
  const start = lines.findIndex((line) => /^##\s+Review\s*$/.test(line.trim()))
  if (start === -1) return null
  const section = []
  for (const line of lines.slice(start + 1)) {
    if (/^##\s/.test(line.trim()) || /^EOF\b/.test(line.trim())) break
    section.push(line)
  }
  return section
}

function unfilledLabels(section) {
  return REVIEWERS.filter(({ label }) => {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const filled = new RegExp(`\\*\\*${escaped}:\\*\\*\\s*\\S`, 'i')
    return !section.some((line) => filled.test(line))
  }).map(({ label }) => label)
}

function checkPullRequest(call) {
  const text = prBodyText(call)
  if (text === null) allow()

  if (agent === 'claude') {
    const runs = readRuns(call.cwd)
    const notRun = REVIEWERS.filter(({ agent: name }) => !runs[name]).map(
      ({ agent: name }) => name
    )
    if (notRun.length > 0) {
      deny(
        `These reviewer agents have not run on this branch: ${notRun.join(', ')}. Start each with the Agent tool (subagent_type set to its name, no model).`
      )
    }
  }

  const section = reviewSection(text)
  if (!section) deny('The PR body has no "## Review" section.')

  const unfilled = unfilledLabels(section)
  if (unfilled.length > 0) {
    deny(`The Review section has no filled line for: ${unfilled.join(', ')}.`)
  }
  allow()
}

const call = normalize(readStdin())
if (!call) allow()
if (agent === 'claude' && /^(Agent|Task)$/.test(call.toolName))
  checkReviewerStart(call)
checkPullRequest(call)
