// @vitest-environment node
import { spawnSync, execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { REVIEWERS } from '../../scripts/agent-hooks/review-gate-policy.mjs'

// End-to-end: runs the hook script with each tool's stdin format, in a
// throwaway git repo. Policy details are covered in review-gate-policy.test.ts.

const HOOK = resolve('scripts/agent-hooks/review-gate.mjs')
// Built at run time so this file never contains a literal PR command.
const CREATE = `${['g', 'h'].join('')} pr create`
const FILLED = [
  '## Review',
  ...REVIEWERS.map(({ label }) => `- **${label}:** no findings`)
].join('\n')

let repo: string

const git = (...args: string[]) =>
  execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', ...args], {
    cwd: repo,
    stdio: 'ignore'
  })

function run(agent: string, event: unknown) {
  const result = spawnSync('node', [HOOK, `--agent=${agent}`], {
    input: typeof event === 'string' ? event : JSON.stringify(event),
    cwd: repo,
    encoding: 'utf8'
  })
  const json = (() => {
    try {
      return JSON.parse(result.stdout)
    } catch {
      return null
    }
  })()
  return { code: result.status, stderr: result.stderr, json }
}

const bash = (command: string) => ({
  tool_name: 'Bash',
  tool_input: { command },
  cwd: repo
})
const stop = (agent: string, output = 'No findings.') => ({
  hook_event_name: 'SubagentStop',
  agent_type: agent,
  last_assistant_message: output,
  cwd: repo
})
const finishAllReviewers = () => {
  for (const { agent } of REVIEWERS)
    expect(run('claude', stop(agent)).code).toBe(0)
}

beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), 'review-gate-'))
  git('init', '-q', '-b', 'main')
  git('commit', '-q', '--allow-empty', '-m', 'base')
  git('update-ref', 'refs/remotes/origin/main', 'HEAD')
  git('checkout', '-q', '-b', 'feat/x')
  git('commit', '-q', '--allow-empty', '-m', 'work')
  writeFileSync(join(repo, 'body.md'), FILLED)
  writeFileSync(join(repo, 'empty.md'), '## Summary\nx')
})

afterEach(() => {
  rmSync(repo, { recursive: true, force: true })
})

describe('Claude Code', () => {
  it('blocks the PR until every reviewer has finished on the branch', () => {
    const first = run('claude', bash(`${CREATE} -F body.md`))
    expect(first.code).toBe(2)
    for (const { agent } of REVIEWERS) expect(first.stderr).toContain(agent)

    finishAllReviewers()
    expect(run('claude', bash(`${CREATE} -F body.md`)).code).toBe(0)
  })

  it('does not count a reviewer that returned nothing', () => {
    finishAllReviewers()
    git('checkout', '-q', '-b', 'feat/y')
    for (const { agent } of REVIEWERS)
      run('claude', stop(agent, agent === 'review-dry' ? '' : 'ok'))
    const result = run('claude', bash(`${CREATE} -F body.md`))
    expect(result.code).toBe(2)
    expect(result.stderr).toMatch(/review-dry/)
  })

  it('keeps branch runs apart, even for names that look alike', () => {
    finishAllReviewers()
    git('checkout', '-q', '-b', 'feat_x')
    expect(run('claude', bash(`${CREATE} -F body.md`)).code).toBe(2)
  })

  it('still counts runs after fix commits', () => {
    finishAllReviewers()
    git('commit', '-q', '--allow-empty', '-m', 'fix a finding')
    expect(run('claude', bash(`${CREATE} -F body.md`)).code).toBe(0)
  })

  it('drops runs from a branch that was deleted and recreated', () => {
    finishAllReviewers()
    git('checkout', '-q', 'main')
    git('branch', '-q', '-D', 'feat/x')
    git('checkout', '-q', '-b', 'feat/x')
    git('commit', '-q', '--allow-empty', '-m', 'new work')
    expect(run('claude', bash(`${CREATE} -F body.md`)).code).toBe(2)
  })

  it('checks the runs of the --head branch', () => {
    finishAllReviewers()
    git('checkout', '-q', '-b', 'other')
    expect(run('claude', bash(`${CREATE} -F body.md --head feat/x`)).code).toBe(
      0
    )
    expect(run('claude', bash(`${CREATE} -F body.md`)).code).toBe(2)
  })

  it('blocks a reviewer started with a model override', () => {
    const start = (input: object) =>
      run('claude', {
        tool_name: 'Agent',
        tool_input: { prompt: 'x', ...input },
        cwd: repo
      })
    expect(start({ subagent_type: 'review-dry', model: 'fable' }).code).toBe(2)
    expect(start({ subagent_type: 'review-dry' }).code).toBe(0)
    expect(start({ subagent_type: 'Explore', model: 'haiku' }).code).toBe(0)
  })

  it('checks MCP create_pull_request bodies', () => {
    finishAllReviewers()
    const mcp = (body: string) =>
      run('claude', {
        tool_name: 'mcp__github__create_pull_request',
        tool_input: { body, head: 'feat/x' },
        cwd: repo
      })
    expect(mcp('').code).toBe(2)
    expect(mcp(FILLED).code).toBe(0)
  })

  it('lets bad stdin and unrelated tools through', () => {
    expect(run('claude', 'not json').code).toBe(0)
    expect(
      run('claude', { tool_name: 'Read', tool_input: {}, cwd: repo }).code
    ).toBe(0)
    expect(run('claude', bash('ls -la')).code).toBe(0)
  })
})

describe('other tools', () => {
  it('Codex: checks the body, with a string or argv command', () => {
    expect(run('codex', bash(`${CREATE} -F body.md`)).code).toBe(0)
    expect(run('codex', bash(`${CREATE} -F empty.md`)).code).toBe(2)
    const argv = {
      tool_name: 'Bash',
      tool_input: { command: ['bash', '-lc', `${CREATE} -F empty.md`] },
      cwd: repo
    }
    expect(run('codex', argv).code).toBe(2)
  })

  it('Gemini: checks shell and MCP calls', () => {
    const shell = (command: string) =>
      run('gemini', {
        tool_name: 'run_shell_command',
        tool_input: { command },
        cwd: repo
      })
    expect(shell(`${CREATE} -F body.md`).code).toBe(0)
    expect(shell(`${CREATE} --fill`).code).toBe(2)
    const mcp = run('gemini', {
      tool_name: 'mcp_github_create_pull_request',
      tool_input: { body: '' },
      cwd: repo
    })
    expect(mcp.code).toBe(2)
  })

  it('Cursor: denies with JSON on stdout, for shell and MCP', () => {
    expect(
      run('cursor', { command: `${CREATE} -F body.md`, cwd: repo }).json
    ).toBeNull()
    const shell = run('cursor', { command: `${CREATE} -F empty.md`, cwd: repo })
    expect(shell.code).toBe(0)
    expect(shell.json).toMatchObject({ permission: 'deny' })
    const mcp = run('cursor', {
      tool_name: 'create_pull_request',
      tool_input: JSON.stringify({ body: '' }),
      cwd: repo
    })
    expect(mcp.json).toMatchObject({ permission: 'deny' })
  })

  it('Copilot: denies with JSON on stdout, with object or string toolArgs', () => {
    const call = (toolArgs: unknown) =>
      run('copilot', { toolName: 'bash', toolArgs, cwd: repo })
    expect(call({ command: `${CREATE} -F body.md` }).json).toBeNull()
    expect(
      call(JSON.stringify({ command: `${CREATE} -F empty.md` })).json
    ).toMatchObject({
      permissionDecision: 'deny'
    })
  })

  it('does not track reviewer runs outside Claude Code', () => {
    expect(run('codex', bash(`${CREATE} -F body.md`)).code).toBe(0)
  })
})

it('fails loudly on an unknown --agent', () => {
  const result = run('claud', bash('ls'))
  expect(result.code).toBe(1)
  expect(result.stderr).toMatch(/unknown --agent/)
})
