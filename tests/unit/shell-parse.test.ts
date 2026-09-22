// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  parseCommands,
  quoteArgv,
  shellScriptOf
} from '../../scripts/agent-hooks/shell-parse.mjs'

const names = (script: string) => parseCommands(script).map((argv) => argv[0])

describe('parseCommands', () => {
  it('splits on operators and newlines', () => {
    expect(names('a && b || c; d | e & f\ng')).toEqual([
      'a',
      'b',
      'c',
      'd',
      'e',
      'f',
      'g'
    ])
  })

  it('joins quoted and escaped parts of a word', () => {
    expect(parseCommands(`g''h "a b" c\\ d`)).toEqual([['gh', 'a b', 'c d']])
  })

  it('drops env assignments, keywords, and wrappers with their flags', () => {
    expect(names('A=1 B=2 x')).toEqual(['x'])
    expect(names('if true; then x; fi')).toEqual(['true', 'x', 'fi'])
    expect(names('sudo -u me env -u FOO nice -n 5 x')).toEqual(['x'])
    expect(names('timeout 60 x')).toEqual(['x'])
    expect(names('timeout -s KILL 60 x')).toEqual(['x'])
    expect(names('/usr/bin/time -f %e x')).toEqual(['x'])
    expect(names('command -- x')).toEqual(['x'])
  })

  it('finds commands inside substitutions, bash -c, and eval', () => {
    expect(names('echo "$(x)"')).toContain('x')
    expect(names('echo `x`')).toContain('x')
    expect(names('echo "`x`"')).toContain('x')
    expect(names('bash -o pipefail -c "x"')).toContain('x')
    expect(names('eval "x y"')).toContain('x')
  })

  it('skips redirect targets', () => {
    expect(parseCommands('x > out.txt 2>&1 < in.txt')).toEqual([['x']])
  })

  it('skips comments', () => {
    expect(names('a # b; c')).toEqual(['a'])
  })

  it('blanks heredoc bodies', () => {
    expect(names("cat <<'EOF'\nx\n(y)\nEOF\nz")).toEqual(['cat', 'z'])
    expect(names('cat <<-END\n\tx\n\tEND\nz')).toEqual(['cat', 'z'])
    expect(names('cat <<A <<B\nx\nA\ny\nB\nz')).toEqual(['cat', 'z'])
    expect(names('echo "$(cat <<\'EOF\'\nx )\nEOF\n)"')).not.toContain('x')
  })

  it('does not take here-strings, quoted <<, or shifts for heredocs', () => {
    expect(names('grep -q a <<< foo\nx')).toContain('x')
    expect(names('echo "a <<Z"\nx')).toContain('x')
    expect(names("echo 'a <<Z'\nx")).toContain('x')
    expect(names('echo $((1 << y))\nx')).toContain('x')
  })
})

describe('shellScriptOf', () => {
  it('returns the -c script of a shell', () => {
    expect(shellScriptOf(['bash', '-lc', 'x'])).toBe('x')
    expect(shellScriptOf(['/bin/sh', '-c', 'x'])).toBe('x')
  })

  it('returns null for other commands', () => {
    expect(shellScriptOf(['bash', 'script.sh'])).toBeNull()
    expect(shellScriptOf(['node', '-c', 'x'])).toBeNull()
  })
})

describe('quoteArgv', () => {
  it('round-trips through parseCommands', () => {
    const argv = ['gh', 'pr', 'create', '-F', "my body's.md", '#', '$(x)']
    expect(parseCommands(quoteArgv(argv))).toEqual([argv])
  })
})
