---
name: review-gate
description: Run the pre-PR review gate. Use before opening any pull request, when asked to review a branch before a PR, or when a hook blocks `gh pr create` for a missing Review section. Runs four read-only reviewers on the branch diff and fills the PR body's Review section.
---

# Pre-PR review gate

Run this before you open a pull request. The rules live in `docs/agents/git-and-prs.md`.

## 1. Run the four reviewers

Run all four on the branch diff, in parallel if your tool can. None of them edits code.

| Reviewer             | Instructions                | Model  |
| -------------------- | --------------------------- | ------ |
| Code quality         | `reviewers/code-quality.md` | Opus   |
| Correctness          | `reviewers/correctness.md`  | Opus   |
| Spec, security, copy | `reviewers/spec.md`         | Sonnet |
| DRY                  | `reviewers/dry.md`          | Opus   |

Reviewers run on Opus, Sonnet, or Haiku only. Never use Fable for a reviewer.

- **Claude Code:** start the agents `review-code-quality`, `review-correctness`, `review-spec`, and `review-dry` with the Agent tool. Do not pass a `model`; each agent file pins its own. A hook blocks the PR until all four have run on the branch.
- **Other tools:** start one subagent per reviewer with its instructions file. If your tool has no subagents, run each reviewer yourself, one at a time, and keep their findings apart.

## 2. Act on the findings

Check each finding against the code. Fix the valid ones. Answer the ones you decline with evidence. File the ones that belong in a later PR as issues.

## 3. Fill the PR body

The PR body needs this section, with each line filled. A hook blocks the PR without it.

```markdown
## Review

- **Code quality:** fixed / declined (why) / filed (issue link)
- **Correctness:** fixed / declined (why) / filed (issue link)
- **Spec, security, copy:** fixed / declined (why) / filed (issue link)
- **DRY:** fixed / declined (why) / filed (issue link)
```

Anything that needs a human decision gets the `needs-eli` label. Open the PR with `gh pr create --body` or `--body-file`, not `--fill` or `--web`.
