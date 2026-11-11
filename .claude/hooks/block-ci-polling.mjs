import { readFileSync } from 'node:fs'

const MAX_SLEEP_SECONDS = 10
const UNIT_SECONDS = { '': 1, s: 1, m: 60, h: 3600, d: 86400 }

// Any sleep word, not only one starting a command, since `timeout 60 sleep 90`
// and `/bin/sleep 90` wait too. Arguments end at a redirect or comment.
const sleepCall = /\bsleep((?:[ \t]+[^\s;&|)\x60<>#]+)+)/g
const atCommandStart = String.raw`(?<=(?:^|[;&|(\x60{\n])[ \t]*|\b(?:do|then|else|while|until)\s+)`
const loopKeyword = new RegExp(
  `${atCommandStart}(?:for|while|until|done|do)(?![\\w-])`,
  'g'
)
const commandSleep = new RegExp(`${atCommandStart}sleep\\s`)
const runWatch = /\bgh\s[^\n;&|]*?\brun\s+watch\b/
// The lookahead and backreference pin the first `pr checks`, so a long line
// without `--watch` can't backtrack cubically.
const checksWatch =
  /\bgh\s(?=([^\n;&|]*?\bpr\s+checks\b))\1[^\n;&|]*?\s--watch\b/

// `watch` reruns its command until it's stopped.
const watchCommand = new RegExp(`${atCommandStart}watch\\s`)
const ghCall = /\bgh\s/
// A `while read` loop works through a list, so only a polling loop counts.
const pollingLoop = /^(?:while|until)\s(?!\s*(?:\w+=\S*\s+)*read\b)/

const shellScript =
  /\b(?:ba|z)?sh\s+(?:-\w+\s+)*-\w*c\w*\s+(?:'([^']*)'|"((?:\\.|[^"\\])*)")/g
// A quoted string is matched too, and skipped, so a script named inside a
// commit message or PR body never counts.
const inlineScriptOrQuoted = new RegExp(
  `${atCommandStart}(perl|ruby|python[\\d.]*|node)\\s+(?:-\\S+\\s+)*?-[ec]\\s+(?:'([^']*)'|"((?:\\\\.|[^"\\\\])*)")|'[^']*'|"(?:\\\\.|[^"\\\\])*"`,
  'g'
)

const paramDefault = /(["']?)\$\{\w+:?[-=]([\d.]+[smhd]?)\}\1/g
const arithmetic = /\$\(\(([\d\s+*]+)\)\)/g

function arithmeticValue(expression) {
  return expression
    .split('+')
    .reduce(
      (sum, term) =>
        sum + term.split('*').reduce((product, n) => product * Number(n), 1),
      0
    )
}

// A line ending in a backslash carries on, so `gh pr checks 1 \` then
// `--watch` is one command. A default or sum the shell works out, as in
// `sleep "${DELAY:-60}"` or `sleep $((5 * 60))`, counts as its number.
function expand(command) {
  return command
    .replace(/<<-?\s*(['"]?)(\w+)\1[^\n]*\n[\s\S]*?\n\s*\2(?=\n|$)/g, '\n')
    .replace(/\\\r?\n/g, ' ')
    .replace(paramDefault, '$2')
    .replace(arithmetic, (_, expression) => String(arithmeticValue(expression)))
}

// Quoted text and heredoc bodies are data (commit messages, PR bodies), not
// commands, so a message that mentions `gh run watch` isn't blocked. A script
// passed to `sh -c` and a quoted number, as in `sleep "60"`, stay.
function stripLiterals(command) {
  return command
    .replace(shellScript, (_, single, double) => single ?? double)
    .replace(/(['"])([\d.]+[smhd]?)\1/g, '$2')
    .replace(/'[^']*'|"(?:\\.|[^"\\])*"/g, "''")
}

function inlineSleepSeconds(command) {
  let total = 0
  for (const [, bin, single, double] of command.matchAll(
    inlineScriptOrQuoted
  )) {
    if (!bin) continue
    const script = single ?? double
    if (bin === 'node') {
      for (const [, ms] of script.matchAll(
        /\bsetTimeout\([\s\S]*?,\s*([\d_]+)\s*\)/g
      ))
        total += Number(ms.replaceAll('_', '')) / 1000
    } else {
      for (const [, seconds] of script.matchAll(/\bsleep\s*\(?\s*([\d.]+)/g))
        total += Number(seconds)
    }
  }
  return total
}

function sleepSeconds(args) {
  let total = 0
  for (const arg of args.trim().split(/\s+/)) {
    if (/^inf(?:inity)?$/i.test(arg)) return Infinity
    const match = /^(\d+(?:\.\d*)?|\.\d+)([smhd]?)$/.exec(arg)
    if (!match) return 0
    total += Number(match[1]) * UNIT_SECONDS[match[2]]
  }
  return total
}

function totalSleepSeconds(code) {
  return [...code.matchAll(sleepCall)].reduce(
    (sum, [, args]) => sum + sleepSeconds(args),
    0
  )
}

function outermostLoops(code) {
  const found = []
  let depth = 0
  let start
  for (const { 0: word, index } of code.matchAll(loopKeyword)) {
    if (word !== 'done') {
      if (depth === 0) start ??= index
      if (word === 'do') depth++
    } else if (depth > 0 && --depth === 0) {
      found.push(code.slice(start, index + word.length))
      start = undefined
    }
  }
  return found
}

function ciPollingFound(command) {
  const expanded = expand(command)
  const code = stripLiterals(expanded)
  return (
    runWatch.test(code) ||
    checksWatch.test(code) ||
    watchCommand.test(code) ||
    outermostLoops(code).some(
      (loop) =>
        commandSleep.test(loop) ||
        totalSleepSeconds(loop) > 0 ||
        (pollingLoop.test(loop) && ghCall.test(loop))
    ) ||
    totalSleepSeconds(code) > MAX_SLEEP_SECONDS ||
    inlineSleepSeconds(expanded) > MAX_SLEEP_SECONDS
  )
}

let input
try {
  input = JSON.parse(readFileSync(0, 'utf8'))
} catch {
  process.exit(0)
}

const command = String(input.tool_input?.command ?? '')

if (!input.tool_input?.run_in_background && ciPollingFound(command)) {
  console.error(
    [
      `Don't wait on CI in the foreground: every poll re-reads the whole session. End your turn instead.`,
      `In the Claude desktop app, Auto-fix and ci-monitor events wake the session when checks finish or fail.`,
      `Elsewhere, start one \`gh pr checks <n> --watch --fail-fast\` with run_in_background, which wakes you when it exits.`,
      `To wait on something local, use Monitor or a run_in_background command. A command may sleep up to ${MAX_SLEEP_SECONDS} seconds in all, outside a loop (skills/shepherd/SKILL.md, step 3).`
    ].join(' ')
  )
  process.exit(2)
}
