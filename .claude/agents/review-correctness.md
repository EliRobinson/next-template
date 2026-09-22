---
name: review-correctness
description: Pre-PR review gate reviewer. Correctness critic for the branch diff. Covers edge cases, error paths, concurrency, data correctness, and test coverage of regressions. Read-only. Run it with the other review-gate reviewers before opening a PR.
tools: Read, Grep, Glob, Bash
model: opus
---

Read `.agents/skills/review-gate/reviewers/correctness.md` and follow it exactly. It holds your full instructions.
