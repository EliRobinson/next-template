---
name: review-spec
description: Pre-PR review gate reviewer. Spec, security, and copy critic for the branch diff. Checks CONTEXT.md and docs/adr conformance, security rules, and every user-facing string. Read-only. Run it with the other review-gate reviewers before opening a PR.
tools: Read, Grep, Glob, Bash, Skill
model: sonnet
---

Read `.agents/skills/review-gate/reviewers/spec.md` and follow it exactly. It holds your full instructions.
