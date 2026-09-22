// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  PLACEHOLDER,
  REVIEWERS,
  decidePr,
  decideReviewerStart,
  findPrCommands,
  unfilledReviewLabels,
  type PrCommand
} from '../../scripts/agent-hooks/review-gate-policy.mjs'

// Built at run time so this file never contains a literal PR command. An
// agent that writes this file through a shell would otherwise trip the hook.
const GH = ['g', 'h'].join('')
const CREATE = `${GH} pr create`

const filledReview = [
  '## Review',
  '',
  ...REVIEWERS.map(({ label }) => `- **${label}:** no findings`)
].join('\n')

const kinds = (script: string) => findPrCommands(script).map((pr) => pr.kind)

describe('findPrCommands: detects PR-opening commands', () => {
  it.each([
    ['plain', `${CREATE} --title x --body-file b.md`],
    ['alias', `${GH} pr new --body-file b.md`],
    ['after &&', `cd repo && ${CREATE} -F b.md`],
    ['after a newline', `echo hi\n${CREATE} -F b.md`],
    ['env prefix', `GH_TOKEN=x ${CREATE} -F b.md`],
    ['command wrapper', `command ${CREATE} -F b.md`],
    ['env wrapper', `env -i A=1 ${CREATE} -F b.md`],
    ['sudo', `sudo -E ${CREATE} -F b.md`],
    ['bash -c', `bash -c "${CREATE} -F b.md"`],
    ['bash -lc', `bash -lc '${CREATE} -F b.md'`],
    ['eval', `eval "${CREATE} -F b.md"`],
    ['if/then', `if true; then ${CREATE} -F b.md; fi`],
    ['subshell', `(${CREATE} -F b.md)`],
    ['brace group', `{ ${CREATE} -F b.md; }`],
    ['command substitution', `url=$(${CREATE} -F b.md)`],
    ['substitution in quotes', `echo "$(${CREATE} -F b.md)"`],
    ['backticks', `echo \`${CREATE} -F b.md\``],
    ['split quotes', `g''h pr create -F b.md`],
    ['full path', `/opt/homebrew/bin/${CREATE} -F b.md`]
  ])('%s', (_, script) => {
    expect(kinds(script)).toEqual(['pr-create'])
  })

  it.each([
    ['POST with fields', `${GH} api repos/o/r/pulls -f title=x -f head=b`],
    ['explicit POST', `${GH} api -X POST repos/o/r/pulls --input body.json`],
    ['method flag', `${GH} api --method=post /repos/o/r/pulls`],
    [
      'graphql mutation',
      `${GH} api graphql -f query='mutation{createPullRequest(input:{}){clientMutationId}}'`
    ],
    [
      'POST after a GET',
      `${GH} api repos/o/r/pulls/1 >/dev/null && ${GH} api -X POST repos/o/r/pulls`
    ]
  ])('gh api: %s', (_, script) => {
    expect(kinds(script)).toContain('api-create')
  })
})

describe('findPrCommands: leaves other commands alone', () => {
  it.each([
    ['ls', 'ls -la'],
    ['pr view', `${GH} pr view 18`],
    ['pr list', `${GH} pr list --state open`],
    ['help', `${CREATE} --help`],
    ['short help', `${CREATE} -h`],
    ['dry run', `${CREATE} --dry-run -F b.md`],
    ['echoed', `echo "${CREATE} --fill"`],
    ['single-quoted', `echo '${CREATE}'`],
    ['grep pattern with a paren', `rg -n "(${CREATE}|foo)" docs`],
    ['comment', `ls # ${CREATE}`],
    [
      'heredoc body',
      `cat > notes.md <<'EOF'\n${CREATE} --web\n(${CREATE})\nEOF\necho done`
    ],
    [
      'heredoc inside a body substitution',
      `echo "$(cat <<'EOF'\n${CREATE}\nEOF\n)"`
    ],
    ['GET pulls list', `${GH} api repos/o/r/pulls --jq '.[].number'`],
    ['GET commit pulls', `${GH} api repos/o/r/commits/abc/pulls`],
    ['GET one pull', `${GH} api repos/o/r/pulls/18`],
    ['POST a comment', `${GH} api repos/o/r/pulls/18/comments -f body=hi`],
    ['graphql query', `${GH} api graphql -f query='{viewer{login}}'`]
  ])('%s', (_, script) => {
    expect(kinds(script)).toEqual([])
  })
})

describe('findPrCommands: reads pr create flags', () => {
  const first = (script: string) => findPrCommands(script)[0]

  it('reads the body file and head, long and short', () => {
    expect(first(`${CREATE} --body-file=b.md --head=feat`)).toMatchObject({
      bodyFile: 'b.md',
      head: 'feat'
    })
    expect(first(`${CREATE} -F "my body.md" -H feat`)).toMatchObject({
      bodyFile: 'my body.md',
      head: 'feat'
    })
  })

  it('does not read a flag out of a flag value', () => {
    expect(first(`${CREATE} --title "Add -F flag" -F b.md`)).toMatchObject({
      bodyFile: 'b.md'
    })
    expect(first(`${CREATE} -t "drop --web" -F b.md`)).toMatchObject({
      web: false
    })
  })

  it('sees short and long fill and web flags', () => {
    expect(first(`${CREATE} -f`)).toMatchObject({ fill: true })
    expect(first(`${CREATE} --fill-first`)).toMatchObject({ fill: true })
    expect(first(`${CREATE} -w`)).toMatchObject({ web: true })
  })

  it('sees an inline body', () => {
    expect(first(`${CREATE} -b hi`)).toMatchObject({
      inlineBody: true,
      bodyFile: undefined
    })
  })
})

describe('unfilledReviewLabels', () => {
  it('passes a filled section', () => {
    expect(
      unfilledReviewLabels(`## Summary\nx\n\n${filledReview}\n\n## Notes\ny`)
    ).toEqual([])
  })

  it('returns null with no Review section', () => {
    expect(unfilledReviewLabels('## Summary\nx')).toBeNull()
  })

  it('names empty and missing lines', () => {
    const body = [
      '## Review',
      '- **Code quality:** ok',
      '- **Correctness:**'
    ].join('\n')
    expect(unfilledReviewLabels(body)).toEqual([
      'Correctness',
      'Spec, security, copy',
      'DRY'
    ])
  })

  it('treats the placeholder as unfilled', () => {
    const body = [
      '## Review',
      ...REVIEWERS.map(({ label }) => `- **${label}:** ${PLACEHOLDER}`)
    ].join('\n')
    expect(unfilledReviewLabels(body)).toHaveLength(REVIEWERS.length)
  })

  it('ignores lines after the next heading and inside comments', () => {
    const body = [
      '## Review',
      '<!-- - **Code quality:** hidden -->',
      '## Later',
      ...REVIEWERS.map(({ label }) => `- **${label}:** too late`)
    ].join('\n')
    expect(unfilledReviewLabels(body)).toHaveLength(REVIEWERS.length)
  })

  it('matches the PR template labels', () => {
    // Fails if the template and REVIEWERS drift apart.
    const template = readFileSync('.github/pull_request_template.md', 'utf8')
    expect(unfilledReviewLabels(template)).toEqual(
      REVIEWERS.map(({ label }) => label)
    )
    const filled = template.replace(/^(- \*\*.+:\*\*)\s*$/gm, '$1 no findings')
    expect(unfilledReviewLabels(filled)).toEqual([])
  })
})

describe('decidePr', () => {
  const pr = (
    overrides: Partial<Extract<PrCommand, { kind: 'pr-create' }>> = {}
  ): PrCommand => ({
    kind: 'pr-create',
    bodyFile: 'b.md',
    inlineBody: false,
    fill: false,
    web: false,
    head: undefined,
    base: undefined,
    ...overrides
  })
  const deps = {
    bodyOf: () => filledReview,
    reviewersNotRun: () => [] as string[]
  }

  it('allows a filled body file with every reviewer run', () => {
    expect(decidePr(pr(), deps)).toBeNull()
  })

  it('checks an MCP body directly', () => {
    expect(
      decidePr(
        {
          kind: 'mcp-create',
          body: filledReview,
          head: 'feat',
          base: undefined
        },
        deps
      )
    ).toBeNull()
    expect(
      decidePr(
        { kind: 'mcp-create', body: '', head: 'feat', base: undefined },
        deps
      )?.deny
    ).toMatch(/## Review/)
  })

  it('denies gh api creates', () => {
    expect(decidePr({ kind: 'api-create' }, deps)?.deny).toMatch(/gh api/)
  })

  it.each([
    ['fill', pr({ fill: true })],
    ['web', pr({ web: true })],
    ['inline body', pr({ bodyFile: undefined, inlineBody: true })],
    ['stdin body', pr({ bodyFile: '-' })]
  ])('denies %s', (_, command) => {
    expect(decidePr(command, deps)).not.toBeNull()
  })

  it('denies a missing body file', () => {
    expect(
      decidePr(pr(), { ...deps, bodyOf: () => ({ missing: 'b.md' }) })?.deny
    ).toMatch(/does not exist/)
  })

  it('denies when reviewers have not run, naming them', () => {
    const decision = decidePr(pr(), {
      ...deps,
      reviewersNotRun: () => ['review-dry']
    })
    expect(decision?.deny).toMatch(/review-dry/)
  })

  it('skips the reviewer check when the tool does not track runs', () => {
    expect(decidePr(pr(), { ...deps, reviewersNotRun: () => null })).toBeNull()
  })

  it('adds the Review format only to Review-section denials', () => {
    expect(decidePr(pr({ web: true }), deps)?.deny).not.toMatch(/## Review/)
    expect(
      decidePr(pr(), { ...deps, bodyOf: () => 'no section' })?.deny
    ).toMatch(/## Review/)
  })
})

describe('decideReviewerStart', () => {
  it('denies a reviewer with a model override', () => {
    expect(
      decideReviewerStart({ subagent_type: 'review-dry', model: 'fable' })?.deny
    ).toMatch(/without a `model`/)
  })

  it('allows a reviewer with no model, and other agents with one', () => {
    expect(decideReviewerStart({ subagent_type: 'review-dry' })).toBeNull()
    expect(
      decideReviewerStart({ subagent_type: 'Explore', model: 'haiku' })
    ).toBeNull()
  })
})
