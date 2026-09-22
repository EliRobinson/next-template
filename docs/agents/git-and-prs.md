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

Four reviewers run in parallel on the branch diff. None of them edits code. Reviewers run on Opus, Sonnet, or Haiku only. Never use Fable for a reviewer; it costs too many tokens.

1. **Thermonuclear code-quality review** (Opus, the `code-quality-review` skill). Covers maintainability, abstractions, and file size.
2. **Correctness critic** (Opus). Covers edge cases, error paths, concurrency, data correctness, and whether the tests would catch a regression.
3. **Spec, security, and copy critic** (Sonnet). Checks conformance with `CONTEXT.md` and `docs/adr/`, the security rules (auth, input validation, secrets, XSS), and every user-facing string, using the `copywriting` skill and the "UI copy" rules in `AGENTS.md`.
4. **DRY critic** (Opus). Hunts duplication: repeated literals and constants, near-duplicate functions, parallel structures that should be one parametrized thing, hand-written types that duplicate generated ones, and the same rule written in two places. It also names abstractions to leave alone, where two things look alike but change for different reasons.

The author checks each finding against the code and fixes the valid ones. Findings the author disagrees with are answered with evidence in the PR body, never dropped silently. The PR body gets a **Review** section that marks each finding as fixed, declined (and why), or filed (with an issue link). Anything that needs a human decision gets the `needs-eli` label.

### Where the gate lives

- **Reviewer instructions:** `.agents/skills/review-gate/`. `SKILL.md` says how to run the gate; `reviewers/*.md` holds one prompt per reviewer. Cursor, Codex, Gemini CLI, and Copilot read `.agents/skills/`. Claude Code reads it through the symlink `.claude/skills/review-gate`.
- **Claude Code reviewer agents:** `.claude/agents/review-*.md`. Each pins its model and points at its prompt in the skill. Cursor reads these files too.

### How the gate is enforced

GitHub cannot tell whether an AI ran the reviewers, so the gate lives in each agent's own pre-tool hook, not in CI. One script, `scripts/agent-hooks/review-gate.mjs`, serves every tool:

| Tool           | Hook config                      | Checks                                                             |
| -------------- | -------------------------------- | ------------------------------------------------------------------ |
| Claude Code    | `.claude/settings.json`          | Review section, all four reviewer agents ran, model not overridden |
| Codex          | `.codex/hooks.json`              | Review section                                                     |
| Gemini CLI     | `.gemini/settings.json`          | Review section                                                     |
| Cursor         | `.cursor/hooks.json`             | Review section                                                     |
| GitHub Copilot | `.github/hooks/review-gate.json` | Review section                                                     |

- **Review section:** the hook blocks `gh pr create`, `gh api .../pulls`, and MCP `create_pull_request` calls unless the PR body has a `## Review` section with a filled line for `**Code quality:**`, `**Correctness:**`, `**Spec, security, copy:**`, and `**DRY:**`. `.github/pull_request_template.md` has the same four lines.
- **Reviewer runs (Claude Code only):** when a `review-*` agent starts, the hook records it in `.git/review-gate/<branch>.json`. The PR is blocked until all four are recorded. A reviewer started with a `model` parameter is blocked, so the model in its agent file always wins. Other tools cannot run the Claude agent files, so they get the Review section check only.
- The hook matches only a command that starts with `gh`, so text that mentions `gh pr create` inside quotes does not trip it. It blocks `--fill` and `--web` because it cannot read those bodies.
- Humans are not blocked. The hooks run only inside AI agents.
