---
name: review-gate
description: Run the pre-PR review gate. Use before opening any pull request, when asked to review a branch before a PR, or when a hook blocks `gh pr create` for a missing Review section. Runs the read-only reviewers on the branch diff and fills the PR body's Review section.
---

# Pre-PR review gate

Run this before you open a pull request. The rules live in `docs/agents/git-and-prs.md`.

## 1. Run the reviewers

Run every reviewer on the branch diff, in parallel if your tool can. None of them edits code. This table is the one list of reviewers and models.

| Reviewer             | Instructions                | Model  |
| -------------------- | --------------------------- | ------ |
| Code quality         | `reviewers/code-quality.md` | Opus   |
| Correctness          | `reviewers/correctness.md`  | Opus   |
| Spec, security, copy | `reviewers/spec.md`         | Sonnet |
| DRY                  | `reviewers/dry.md`          | Opus   |

Reviewers run on Opus, Sonnet, or Haiku only. Never use Fable for a reviewer.

- **Claude Code:** start one `review-*` agent per reviewer (`.claude/agents/`) with the Agent tool. Do not pass a `model`; each agent file pins its own, and a hook blocks an override. A hook also blocks the PR until each reviewer has finished on the branch.
- **Other tools:** start one subagent per reviewer with its instructions file. If your tool has no subagents, run each reviewer yourself, one at a time, and keep their findings apart.

## 2. Act on the findings

Check each finding against the code. Fix the valid ones. Answer the ones you decline with evidence. File the ones that belong in a later PR as issues.

## 3. Open the PR

1. Write the PR body to a file, in its own step. Fill each reviewer line of the `## Review` section in `.github/pull_request_template.md` with that reviewer's findings: fixed, declined (and why), or filed (with an issue link).
2. Run `gh pr create --body-file <path>`.

A hook blocks the PR if a reviewer line is empty. It also blocks `--body`, `--fill`, and `--web`, because it checks the body file. Anything that needs a human decision gets the `needs-eli` label.
