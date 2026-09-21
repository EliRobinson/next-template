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
