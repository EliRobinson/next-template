// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  REVIEWERS,
  countsAsRun,
  decidePr,
  decideReviewerStart,
  findPrCommands,
  prCommandsOf,
  reviewersWithoutRun,
  unfilledReviewLabels
} from '../../scripts/agent-hooks/review-gate-policy.mjs'
import { CREATE, GH, filledReview } from './review-gate-fixtures'

const kinds = (script: string) => findPrCommands(script).map((pr) => pr.kind)
const first = (script: string) => findPrCommands(script)[0]
const labels = REVIEWERS.map(({ label }) => label)
const agents = REVIEWERS.map(({ agent }) => agent)
const firstAgent = REVIEWERS[0].agent

describe('findPrCommands: detects PR-opening commands', () => {
  it.each([
    ['plain', `${CREATE} --title x --body-file b.md`],
    ['alias', `${GH} pr new --body-file b.md`],
    ['repo flag before the subcommand', `${GH} pr -R o/r create -F b.md`],
    ['repo= flag before the subcommand', `${GH} pr --repo=o/r create -F b.md`],
    ['after &&', `cd repo && ${CREATE} -F b.md`],
    ['env prefix', `GH_TOKEN=x ${CREATE} -F b.md`],
    ['wrapper with a flag value', `sudo -u me ${CREATE} -F b.md`],
    ['timeout', `timeout 60 ${CREATE} -F b.md`],
    ['bash -c', `bash -c "${CREATE} -F b.md"`],
    ['eval', `eval "${CREATE} -F b.md"`],
    ['substitution in quotes', `echo "$(${CREATE} -F b.md)"`],
    ['backticks', `echo \`${CREATE} -F b.md\``],
    ['split quotes', `g''h pr create -F b.md`],
    ['full path', `/opt/homebrew/bin/${CREATE} -F b.md`],
    ['after a here-string', `grep -q x <<< foo\n${CREATE} --fill`],
    ['after a quoted <<', `echo "a <<Z"\n${CREATE} --fill`],
    ['help=false', `${CREATE} --help=false --fill`]
  ])('%s', (_, script) => {
    expect(kinds(script)).toEqual(['pr-create'])
  })

  it.each([
    ['POST with fields', `${GH} api repos/o/r/pulls -f title=x -f head=b`],
    ['attached field values', `${GH} api repos/o/r/pulls -ftitle=x -fhead=b`],
    ['explicit POST', `${GH} api -X POST repos/o/r/pulls --input body.json`],
    ['method flag', `${GH} api --method=post /repos/o/r/pulls`],
    [
      'inline graphql mutation',
      `${GH} api graphql -f query='mutation{createPullRequest(input:{}){clientMutationId}}'`
    ],
    [
      'POST after a GET',
      `${GH} api repos/o/r/pulls/1 && ${GH} api -X POST repos/o/r/pulls`
    ]
  ])('gh api: %s', (_, script) => {
    expect(kinds(script)).toContain('api-create')
  })

  it('flags graphql calls that read the query from a file', () => {
    expect(first(`${GH} api graphql -f query=@m.graphql`)).toEqual({
      kind: 'graphql-files',
      files: ['m.graphql'],
      dir: undefined
    })
    expect(first(`cd sub && ${GH} api graphql --input m.json`)).toMatchObject({
      files: ['m.json'],
      dir: 'sub'
    })
  })
})

describe('findPrCommands: leaves other commands alone', () => {
  it.each([
    ['ls', 'ls -la'],
    ['pr view', `${GH} pr view 18`],
    ['help', `${CREATE} --help`],
    ['short help', `${CREATE} -h`],
    ['dry run', `${CREATE} --dry-run -F b.md`],
    ['echoed', `echo "${CREATE} --fill"`],
    ['single-quoted', `echo '${CREATE}'`],
    ['grep pattern with a paren', `rg -n "(${CREATE}|foo)" docs`],
    ['comment', `ls # ${CREATE}`],
    ['heredoc body', `cat > notes.md <<'EOF'\n${CREATE} --web\nEOF\necho done`],
    ['GET pulls list', `${GH} api repos/o/r/pulls --jq '.[].number'`],
    ['GET commit pulls', `${GH} api repos/o/r/commits/abc/pulls`],
    ['POST a comment', `${GH} api repos/o/r/pulls/18/comments -f body=hi`],
    ['inline graphql query', `${GH} api graphql -f query='{viewer{login}}'`]
  ])('%s', (_, script) => {
    expect(kinds(script)).toEqual([])
  })
})

describe('findPrCommands: reads pr create flags', () => {
  it('reads the body file, head, and base, long and short', () => {
    expect(
      first(`${CREATE} --body-file=b.md --head=feat --base=dev`)
    ).toMatchObject({
      bodyFile: 'b.md',
      head: 'feat',
      base: 'dev'
    })
    expect(first(`${CREATE} -F "my body.md" -H feat -B dev`)).toMatchObject({
      bodyFile: 'my body.md',
      head: 'feat',
      base: 'dev'
    })
    expect(first(`${CREATE} -Fb.md`)).toMatchObject({ bodyFile: 'b.md' })
  })

  it('does not read a flag out of a flag value', () => {
    expect(first(`${CREATE} --title "Add -F flag" -F b.md`)).toMatchObject({
      bodyFile: 'b.md'
    })
    expect(first(`${CREATE} -t "drop --web" -F b.md`)).toMatchObject({
      web: false
    })
  })

  it('sees fill and web flags, and ignores =false', () => {
    expect(first(`${CREATE} -f`)).toMatchObject({ fill: true })
    expect(first(`${CREATE} --fill-first`)).toMatchObject({ fill: true })
    expect(first(`${CREATE} -w`)).toMatchObject({ web: true })
    expect(first(`${CREATE} -F b.md --fill=false`)).toMatchObject({
      fill: false
    })
  })

  it('tracks the directory a literal cd moves to', () => {
    expect(first(`cd a && cd b/c && ${CREATE} -F ../x.md`)).toMatchObject({
      dir: 'a/b/c'
    })
    expect(first(`cd "$DIR" && ${CREATE} -F x.md`)).toMatchObject({
      dir: undefined
    })
  })
})

describe('prCommandsOf', () => {
  it('reads an MCP call', () => {
    expect(
      prCommandsOf({ kind: 'mcp', input: { body: 'x', head: 'feat', base: 7 } })
    ).toEqual([
      { kind: 'mcp-create', body: 'x', head: 'feat', base: undefined }
    ])
  })

  it('reads a shell call', () => {
    expect(
      prCommandsOf({ kind: 'shell', command: `${CREATE} -F b.md` })
    ).toHaveLength(1)
  })
})

describe('unfilledReviewLabels', () => {
  it('passes a filled section', () => {
    expect(
      unfilledReviewLabels(`## Summary\nx\n\n${filledReview()}\n\n## Notes\ny`)
    ).toEqual([])
  })

  it('returns null with no Review section', () => {
    expect(unfilledReviewLabels('## Summary\nx')).toBeNull()
  })

  it('names empty and missing lines', () => {
    const [firstReviewer, secondReviewer] = REVIEWERS
    const body = [
      '## Review',
      `- **${firstReviewer.label}:** ok`,
      `- **${secondReviewer.label}:**`
    ].join('\n')
    expect(unfilledReviewLabels(body)).toEqual(labels.slice(1))
  })

  it('ignores lines after the next heading and inside comments', () => {
    const body = [
      '## Review',
      `<!-- - **${labels[0]}:** hidden -->`,
      '## Later',
      ...labels.map((label) => `- **${label}:** too late`)
    ].join('\n')
    expect(unfilledReviewLabels(body)).toEqual(labels)
  })
})

describe('reviewer list stays in step', () => {
  const skill = readFileSync('.agents/skills/review-gate/SKILL.md', 'utf8')

  it('matches the PR template labels', () => {
    const template = readFileSync('.github/pull_request_template.md', 'utf8')
    expect(unfilledReviewLabels(template)).toEqual(labels)
    const filled = template.replace(/^(- \*\*.+:\*\*)\s*$/gm, '$1 no findings')
    expect(unfilledReviewLabels(filled)).toEqual([])
  })

  it.each(REVIEWERS.map((reviewer) => [reviewer.agent, reviewer] as const))(
    '%s has an agent file, a skill row, and a prompt that match',
    (agent, { label }) => {
      const file = readFileSync(`.claude/agents/${agent}.md`, 'utf8')
      const model = /^model:\s*(\S+)/m.exec(file)?.[1]
      const prompt =
        /`(\.agents\/skills\/review-gate\/reviewers\/[\w-]+\.md)`/.exec(
          file
        )?.[1]
      expect(model).toMatch(/^(opus|sonnet|haiku)$/)
      expect(prompt && existsSync(prompt)).toBe(true)

      const row = skill
        .split('\n')
        .find((line) => line.includes(`\`${agent}\``))
      expect(row).toContain(`| ${label} `)
      expect(row).toContain(`| ${model} `)
      expect(row).toContain(prompt?.replace('.agents/skills/review-gate/', ''))
    }
  )
})

describe('countsAsRun', () => {
  it('counts a reviewer that returned a report', () => {
    expect(countsAsRun(firstAgent, 'No findings.')).toBe(true)
  })

  it('does not count empty output or other agents', () => {
    expect(countsAsRun(firstAgent, '  ')).toBe(false)
    expect(countsAsRun(firstAgent, undefined)).toBe(false)
    expect(countsAsRun('Explore', 'report')).toBe(false)
  })
})

describe('reviewersWithoutRun', () => {
  // A line of history: base <- a <- b. `isAncestor(x, y)` is true when x
  // comes at or before y.
  const order = ['base', 'a', 'b']
  const isAncestor = (commit: string, of: string) =>
    order.includes(commit) && order.indexOf(commit) <= order.indexOf(of)
  const allRanOn = (head: string) =>
    Object.fromEntries(agents.map((agent) => [agent, { head }]))

  it('counts runs on the head or an earlier branch commit', () => {
    expect(
      reviewersWithoutRun(allRanOn('b'), {
        head: 'b',
        base: 'base',
        isAncestor
      })
    ).toEqual([])
    expect(
      reviewersWithoutRun(allRanOn('a'), {
        head: 'b',
        base: 'base',
        isAncestor
      })
    ).toEqual([])
  })

  it('drops runs on a commit that is not on the branch', () => {
    expect(
      reviewersWithoutRun(allRanOn('gone'), {
        head: 'b',
        base: 'base',
        isAncestor
      })
    ).toEqual(agents)
  })

  it('drops runs made before the branch had its own commits', () => {
    expect(
      reviewersWithoutRun(allRanOn('base'), {
        head: 'b',
        base: 'base',
        isAncestor
      })
    ).toEqual(agents)
  })

  it('names only the reviewers that are missing', () => {
    const runs = { ...allRanOn('b'), [firstAgent]: undefined }
    expect(
      reviewersWithoutRun(runs, { head: 'b', base: null, isAncestor })
    ).toEqual([firstAgent])
  })

  it('counts nothing when the branch has no commit', () => {
    expect(
      reviewersWithoutRun(allRanOn('b'), { head: null, base: null, isAncestor })
    ).toEqual(agents)
  })
})

describe('decidePr', () => {
  const pr = {
    kind: 'pr-create',
    bodyFile: 'b.md',
    fill: false,
    web: false
  } as const
  const deps = { readFile: () => filledReview(), reviewersNotRun: () => [] }

  it('allows a filled body file with every reviewer run', () => {
    expect(decidePr(pr, deps)).toBeNull()
  })

  it('checks an MCP body directly', () => {
    expect(
      decidePr({ kind: 'mcp-create', body: filledReview() }, deps)
    ).toBeNull()
    expect(decidePr({ kind: 'mcp-create', body: '' }, deps)?.deny).toMatch(
      /## Review/
    )
  })

  it('denies gh api creates', () => {
    expect(decidePr({ kind: 'api-create' }, deps)?.deny).toMatch(/gh api/)
  })

  it('denies a graphql file only when it creates a PR', () => {
    const files = { kind: 'graphql-files' as const, files: ['m.graphql'] }
    expect(
      decidePr(files, {
        ...deps,
        readFile: () => 'mutation { createPullRequest }'
      })
    ).not.toBeNull()
    expect(
      decidePr(files, { ...deps, readFile: () => '{ viewer { login } }' })
    ).toBeNull()
    expect(decidePr(files, { ...deps, readFile: () => null })).toBeNull()
  })

  it.each([
    ['fill', { ...pr, fill: true }],
    ['web', { ...pr, web: true }],
    ['no body file', { ...pr, bodyFile: undefined }],
    ['stdin body', { ...pr, bodyFile: '-' }]
  ])('denies %s', (_, command) => {
    expect(decidePr(command, deps)).not.toBeNull()
  })

  it('denies a missing body file', () => {
    expect(decidePr(pr, { ...deps, readFile: () => null })?.deny).toMatch(
      /does not exist/
    )
  })

  it('denies when reviewers have not run, naming them', () => {
    expect(
      decidePr(pr, { ...deps, reviewersNotRun: () => [firstAgent] })?.deny
    ).toContain(firstAgent)
  })

  it('adds the Review format only to Review-section denials', () => {
    expect(decidePr({ ...pr, web: true }, deps)?.deny).not.toMatch(/## Review/)
    expect(
      decidePr(pr, { ...deps, readFile: () => 'no section' })?.deny
    ).toMatch(/## Review/)
  })
})

describe('decideReviewerStart', () => {
  it('denies a reviewer with a model override', () => {
    expect(
      decideReviewerStart({ subagent_type: firstAgent, model: 'fable' })?.deny
    ).toMatch(/without a `model`/)
  })

  it('allows a reviewer with no model, and other agents with one', () => {
    expect(decideReviewerStart({ subagent_type: firstAgent })).toBeNull()
    expect(
      decideReviewerStart({ subagent_type: 'Explore', model: 'haiku' })
    ).toBeNull()
  })
})
