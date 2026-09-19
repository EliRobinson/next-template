# Working with other agents

Several agents may build in parallel, each in its own worktree and branch, and each owns the files named in its GitHub issue.

- **Talk to your peers directly.** Use `SendMessage` to ask the owner of a contract before you guess at its shape. Tell dependent agents when you push an interface change. The first line of a message must stand on its own.
- **Do not duplicate work.** Before building a helper, check the other branches (`git fetch origin` then `git show origin/<branch>:<path>`) and the issues (`gh issue list`). If someone else owns it, ask them for it.
- **Stay in your lane.** Never edit files another agent owns. Ask the owner, or leave a note on their issue.
- **Record decisions on the issue.** Messages are not saved anywhere lasting, so a contract or scope decision also goes into a comment on the relevant GitHub issue.
- **Never bypass hooks.** See `docs/agents/git-and-prs.md`.
