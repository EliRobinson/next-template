// @ts-check
// A small shell parser for the review gate hook. It is not a full shell: it
// finds every simple command in a script, including ones inside `$(...)`,
// backticks, `bash -c`, and `eval`, and ignores text inside quotes,
// comments, and heredoc bodies. See docs/agents/git-and-prs.md for what it
// does not catch.

/** @typedef {{ word: string } | { op: string }} Token */

/**
 * Blanks every heredoc body, so text inside one never parses as a command.
 * Tracks quotes, `$(...)`, backticks, and `$((...))`, so `<<` inside a
 * string, a here-string (`<<<`), or an arithmetic shift is not a heredoc.
 * @param {string} script
 */
function blankHeredocBodies(script) {
  /** @type {Array<'code' | 'sub' | 'paren' | 'dq' | 'bt' | 'arith'>} */
  const stack = ['code']
  /** @type {Array<{ delimiter: string, dash: boolean }>} */
  const pending = []
  let out = ''
  let i = 0
  const top = () => stack[stack.length - 1]
  const inCode = () => top() !== 'dq' && top() !== 'arith'

  while (i < script.length) {
    const ch = script[i]
    const next = script[i + 1]

    if (ch === '\n' && pending.length > 0) {
      out += '\n'
      i++
      while (pending.length > 0 && i < script.length) {
        const end = script.indexOf('\n', i)
        const lineEnd = end === -1 ? script.length : end
        const line = script.slice(i, lineEnd)
        const heredoc = pending[0]
        const text = heredoc?.dash ? line.replace(/^\t+/, '') : line
        if (text === heredoc?.delimiter) pending.shift()
        out += '\n'
        i = lineEnd + 1
      }
      continue
    }

    if (ch === '\\') {
      out += script.slice(i, i + 2)
      i += 2
    } else if (top() === 'arith') {
      if (ch === '(') stack.push('arith')
      if (ch === ')') stack.pop()
      out += ch
      i++
    } else if (top() === 'dq') {
      if (ch === '"') stack.pop()
      else if (ch === '$' && next === '(' && script[i + 2] === '(') {
        stack.push('arith')
        out += '$('
        i += 2
        continue
      } else if (ch === '$' && next === '(') {
        stack.push('sub')
        out += '$('
        i += 2
        continue
      } else if (ch === '`') stack.push('bt')
      out += ch
      i++
    } else if (ch === "'") {
      const end = script.indexOf("'", i + 1)
      const close = end === -1 ? script.length : end + 1
      out += script.slice(i, close)
      i = close
    } else if (ch === '#' && /[\s;&|()]/.test(script[i - 1] ?? ' ')) {
      const end = script.indexOf('\n', i)
      const close = end === -1 ? script.length : end
      out += script.slice(i, close)
      i = close
    } else if (ch === '"') {
      stack.push('dq')
      out += ch
      i++
    } else if (ch === '$' && next === '(' && script[i + 2] === '(') {
      stack.push('arith')
      out += '$('
      i += 2
    } else if (ch === '$' && next === '(') {
      stack.push('sub')
      out += '$('
      i += 2
    } else if (ch === '(') {
      stack.push('paren')
      out += ch
      i++
    } else if (ch === ')') {
      if (stack.length > 1) stack.pop()
      out += ch
      i++
    } else if (ch === '`') {
      if (top() === 'bt') stack.pop()
      else stack.push('bt')
      out += ch
      i++
    } else if (ch === '<' && next === '<' && script[i + 2] === '<') {
      out += '<<<'
      i += 3
    } else if (ch === '<' && next === '<' && inCode()) {
      const match = /^<<(-?)[ \t]*(?:'([^']*)'|"([^"]*)"|([^\s;&|()<>]+))/.exec(
        script.slice(i)
      )
      if (match) {
        const delimiter = (match[2] ?? match[3] ?? match[4] ?? '').replace(
          /['"\\]/g,
          ''
        )
        pending.push({ delimiter, dash: match[1] === '-' })
        out += match[0]
        i += match[0].length
      } else {
        out += '<<'
        i += 2
      }
    } else {
      out += ch
      i++
    }
  }
  return out
}

/**
 * Reads a `$(...)` or backtick substitution that starts at `start`.
 * Returns its body and the index just past its end.
 * @param {string} text
 * @param {number} start
 */
function readNested(text, start) {
  if (text[start] === '`') {
    const end = text.indexOf('`', start + 1)
    const close = end === -1 ? text.length : end
    return { body: text.slice(start + 1, close), end: close + 1 }
  }
  let depth = 1
  /** @type {string | null} */
  let quote = null
  for (let i = start + 2; i < text.length; i++) {
    const ch = text[i]
    if (quote) {
      if (ch === '\\' && quote === '"') i++
      else if (ch === quote) quote = null
    } else if (ch === '\\') i++
    else if (ch === "'" || ch === '"') quote = ch
    else if (ch === '(') depth++
    else if (ch === ')' && --depth === 0) {
      return { body: text.slice(start + 2, i), end: i + 1 }
    }
  }
  return { body: text.slice(start + 2), end: text.length }
}

const OPERATORS = ['&&', '||', ';;', '|&', ';', '|', '&', '(', ')', '\n']

/**
 * Splits a script into tokens. Substitution bodies go into `nested`.
 * @param {string} script
 * @param {string[]} nested
 * @returns {Token[]}
 */
function tokenize(script, nested) {
  /** @type {Token[]} */
  const tokens = []
  /** @type {string | null} */
  let word = null
  const append = (/** @type {string} */ text) => {
    word = (word ?? '') + text
  }
  const endWord = () => {
    if (word !== null) tokens.push({ word })
    word = null
  }
  const isSubstitution = (/** @type {number} */ i) =>
    script[i] === '`' || (script[i] === '$' && script[i + 1] === '(')
  const substitute = (/** @type {number} */ i) => {
    const { body, end } = readNested(script, i)
    nested.push(body)
    append(script.slice(i, end))
    return end - 1
  }

  for (let i = 0; i < script.length; i++) {
    const ch = script[i] ?? ''
    if (ch === ' ' || ch === '\t') {
      endWord()
    } else if (ch === '#' && word === null) {
      while (i + 1 < script.length && script[i + 1] !== '\n') i++
    } else if (ch === '\\') {
      if (script[i + 1] !== '\n') append(script[i + 1] ?? '')
      i++
    } else if (ch === "'") {
      const end = script.indexOf("'", i + 1)
      const close = end === -1 ? script.length : end
      append(script.slice(i + 1, close))
      i = close
    } else if (ch === '"') {
      append('')
      for (i++; i < script.length && script[i] !== '"'; i++) {
        if (script[i] === '\\') append(script[++i] ?? '')
        else if (isSubstitution(i)) i = substitute(i)
        else append(script[i] ?? '')
      }
    } else if (isSubstitution(i)) {
      i = substitute(i)
    } else if (ch === '<' || ch === '>') {
      // A file descriptor before a redirect, as in `2>&1`, is not a word.
      if (word !== null && /^\d+$/.test(word)) word = null
      endWord()
      while (/[<>&]/.test(script[i + 1] ?? '')) i++
      tokens.push({ op: 'redirect' })
    } else {
      const op = OPERATORS.find((candidate) => script.startsWith(candidate, i))
      if (op) {
        endWord()
        tokens.push({ op })
        i += op.length - 1
      } else {
        append(ch)
      }
    }
  }
  endWord()
  return tokens
}

const KEYWORDS = new Set([
  'if',
  'then',
  'else',
  'elif',
  'do',
  'while',
  'until',
  '!',
  '{',
  '}'
])

// Commands that run the rest of their argv as a command, with the flags of
// theirs that take a value, and how many positional args come first.
/** @type {Record<string, { valueFlags: string[], positional?: number }>} */
const WRAPPERS = {
  builtin: { valueFlags: [] },
  command: { valueFlags: [] },
  env: { valueFlags: ['-u', '--unset', '-C', '--chdir'] },
  exec: { valueFlags: ['-a'] },
  nice: { valueFlags: ['-n', '--adjustment'] },
  nohup: { valueFlags: [] },
  npx: { valueFlags: ['-p', '--package'] },
  sudo: {
    valueFlags: [
      '-u',
      '--user',
      '-g',
      '--group',
      '-h',
      '--host',
      '-p',
      '--prompt',
      '-C',
      '-D',
      '-r',
      '-t',
      '-U',
      '-T'
    ]
  },
  time: { valueFlags: ['-f', '--format', '-o', '--output'] },
  timeout: {
    valueFlags: ['-s', '--signal', '-k', '--kill-after'],
    positional: 1
  },
  xargs: { valueFlags: ['-I', '-L', '-n', '-P', '-d', '-E', '-s', '-a'] }
}
const SHELLS = new Set(['sh', 'bash', 'zsh', 'dash', 'ksh'])
const ASSIGNMENT = /^[A-Za-z_]\w*=/

/** @param {string} path */
export function basename(path) {
  return path.slice(path.lastIndexOf('/') + 1)
}

/**
 * Drops env assignments, shell keywords, and wrapper commands (with their
 * flags) from the front of a command.
 * @param {string[]} argv
 */
function unwrap(argv) {
  let rest = argv
  for (;;) {
    const first = rest[0]
    if (first === undefined) return rest
    const wrapper = WRAPPERS[basename(first)]
    if (ASSIGNMENT.test(first) || KEYWORDS.has(first)) {
      rest = rest.slice(1)
    } else if (wrapper) {
      rest = rest.slice(1)
      while (rest[0]?.startsWith('-')) {
        const flag = rest[0]
        rest = rest.slice(wrapper.valueFlags.includes(flag) ? 2 : 1)
        if (flag === '--') break
      }
      rest = rest.slice(wrapper.positional ?? 0)
    } else {
      return rest
    }
  }
}

/**
 * The script a shell runs with `-c`, as in `bash -lc '<script>'`.
 * @param {string[]} argv
 * @returns {string | null}
 */
export function shellScriptOf(argv) {
  if (!SHELLS.has(basename(argv[0] ?? ''))) return null
  const flag = argv.findIndex(
    (arg, i) => i > 0 && /^-[a-zA-Z]*c[a-zA-Z]*$/.test(arg)
  )
  return flag === -1 ? null : (argv[flag + 1] ?? null)
}

/**
 * Joins argv into a script that parses back to the same words.
 * @param {string[]} argv
 */
export function quoteArgv(argv) {
  return argv.map((arg) => `'${arg.replace(/'/g, `'\\''`)}'`).join(' ')
}

/**
 * Every simple command in the script, as an argv array, in order. Commands
 * from nested scripts come after the commands of the script around them.
 * @param {string} script
 * @param {number} [depth]
 * @returns {string[][]}
 */
export function parseCommands(script, depth = 0) {
  if (depth > 5) return []
  /** @type {string[]} */
  const nested = []
  const tokens = tokenize(blankHeredocBodies(script), nested)
  /** @type {string[][]} */
  const commands = []
  /** @type {string[]} */
  let argv = []
  let skipNext = false
  const flush = () => {
    const command = unwrap(argv)
    if (command.length > 0) commands.push(command)
    argv = []
  }
  for (const token of tokens) {
    if ('op' in token && token.op === 'redirect') skipNext = true
    else if ('op' in token) flush()
    else if (skipNext) skipNext = false
    else argv.push(token.word)
  }
  flush()

  /** @type {string[][]} */
  const inner = []
  for (const command of commands) {
    const script = shellScriptOf(command)
    if (script !== null) inner.push(...parseCommands(script, depth + 1))
    else if (command[0] === 'eval')
      inner.push(...parseCommands(command.slice(1).join(' '), depth + 1))
  }
  for (const body of nested) inner.push(...parseCommands(body, depth + 1))
  return [...commands, ...inner]
}
