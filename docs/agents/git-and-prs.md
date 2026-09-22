# Git, hooks, and pull requests

## Commit standards

This project enforces **Conventional Commits**:

```
<type>(<optional scope>): <subject>

[optional body]

[optional footer(s)]
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

Use `pnpm commit` for the interactive Commitizen prompt. Direct `git commit` is validated by the `commit-msg` Husky hook.

**Breaking changes:** add `!` after the type (`feat!:`) and a `BREAKING CHANGE:` footer.

## Hooks

Husky hooks live in `.husky/`. Never bypass them (`--no-verify`). If a hook fails, fix the cause. Skip a hook only when a human says to. If a hook fails on a file you do not own, stop and tell the owner and the coordinator.

## Review gate (before a PR is opened)

Before a PR is opened, read-only reviewers run on the branch diff. The `review-gate` skill (`.agents/skills/review-gate/SKILL.md`) lists each reviewer, its model, and how to run it. Reviewers run on Opus, Sonnet, or Haiku only, never Fable. Fable costs too many tokens.

The author checks each finding against the code and fixes the valid ones. Findings the author disagrees with are answered with evidence in the PR body, never dropped silently. The PR body gets a **Review** section, one line per reviewer, that marks each finding as fixed, declined (and why), or filed (with an issue link). Anything that needs a human decision gets the `needs-eli` label.

### Where the gate lives

- **Reviewer instructions:** `.agents/skills/review-gate/`. `SKILL.md` says how to run the gate. `reviewers/*.md` holds one prompt per reviewer, and `reviewers/_protocol.md` the steps they share. Cursor, Codex, Gemini CLI, and Copilot read `.agents/skills/`. Claude Code reads it through the symlink `.claude/skills/review-gate`.
- **Claude Code reviewer agents:** `.claude/agents/review-*.md`. Each pins its model and points at its prompt in the skill. Cursor reads these files too.
- **Hook:** `scripts/agent-hooks/review-gate-policy.mjs` holds the rules, with no I/O. `scripts/agent-hooks/review-gate.mjs` reads each tool's input and writes its output. Tests: `tests/unit/review-gate-*.test.ts`.

### How the gate is enforced

GitHub cannot tell whether an AI ran the reviewers, so the gate lives in each agent's own hooks, not in CI. It is a guardrail against skipping the review, not a lock: an agent that sets out to get past it can, for example by running a script file that opens the PR.

| Tool           | Hook config                      | Checks                                           |
| -------------- | -------------------------------- | ------------------------------------------------ |
| Claude Code    | `.claude/settings.json`          | Review section, reviewer runs, no model override |
| Codex          | `.codex/hooks.json`              | Review section                                   |
| Gemini CLI     | `.gemini/settings.json`          | Review section                                   |
| Cursor         | `.cursor/hooks.json`             | Review section                                   |
| GitHub Copilot | `.github/hooks/review-gate.json` | Review section                                   |

- **What counts as opening a PR:** `gh pr create` or `gh pr new`, a POST to `gh api repos/.../pulls`, a `createPullRequest` GraphQL mutation, and any MCP `create_pull_request` tool. The hook parses the shell command, so it finds these after `&&`, env prefixes, `sudo`, `bash -c`, `eval`, and `$(...)`, and ignores them inside quotes, comments, and heredoc bodies. `--help` and `--dry-run` pass.
- **Review section:** the PR body must be a file passed with `--body-file`, or the `body` of an MCP call. Its `## Review` section needs a filled line for each reviewer label in `.github/pull_request_template.md`. A test fails if the template and the hook's reviewer list drift apart.
- **Reviewer runs (Claude Code only):** when a `review-*` agent finishes with a report, a `SubagentStop` hook records the commit it reviewed in `.git/review-gate/<branch>.json`. The PR is blocked until every reviewer has a run on a commit of the PR branch that is newer than the base. Fix commits made after the review still count. A reviewer started with a `model` parameter is blocked, so its agent file's model always wins. Other tools cannot run the Claude agent files, so they get the Review section check only.
- **Failures:** input the hook cannot parse passes through, so a broken hook never locks an agent out of the shell. Once a call is known to open a PR, any error blocks it.
- Humans are not blocked. The hooks run only inside AI agents.
