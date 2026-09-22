export interface Reviewer {
  agent: string
  label: string
}

export type PrCommand =
  | {
      kind: 'pr-create'
      bodyFile: string | undefined
      inlineBody: boolean
      fill: boolean
      web: boolean
      head: string | undefined
      base: string | undefined
    }
  | { kind: 'api-create' }
  | {
      kind: 'mcp-create'
      body: string
      head: string | undefined
      base: string | undefined
    }

export type Decision = { deny: string } | null

export const REVIEWERS: Reviewer[]
export const PLACEHOLDER: string
export function stripHeredocBodies(script: string): string
export function parseCommands(script: string): string[][]
export function findPrCommands(script: string): PrCommand[]
export function unfilledReviewLabels(markdown: string): string[] | null
export function decidePr(
  pr: PrCommand,
  deps: {
    bodyOf: (pr: PrCommand) => string | { missing: string }
    reviewersNotRun: (pr: PrCommand) => string[] | null
  }
): Decision
export function decideReviewerStart(input: {
  subagent_type?: string
  model?: string
}): Decision
