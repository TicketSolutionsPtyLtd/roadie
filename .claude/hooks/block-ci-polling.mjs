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
const checksWatch = /\bgh\s[^\n;&|]*?\bpr\s+checks\b[^\n;&|]*?\s--watch\b/

const shellScript =
  /\b(?:ba|z)?sh\s+(?:-\w+\s+)*-\w*c\w*\s+(?:'([^']*)'|"((?:\\.|[^"\\])*)")/g

// Quoted text and heredoc bodies are data (commit messages, PR bodies), not
// commands, so a message that mentions `gh run watch` isn't blocked. A script
// passed to `sh -c` and a quoted number, as in `sleep "60"`, stay.
function stripLiterals(command) {
  return command
    .replace(/<<-?\s*(['"]?)(\w+)\1[^\n]*\n[\s\S]*?\n\s*\2(?=\n|$)/g, '\n')
    .replace(shellScript, (_, single, double) => single ?? double)
    .replace(/(['"])([\d.]+[smhd]?)\1/g, '$2')
    .replace(/'[^']*'|"(?:\\.|[^"\\])*"/g, "''")
}

function sleepSeconds(args) {
  let total = 0
  for (const arg of args.trim().split(/\s+/)) {
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
  const code = stripLiterals(command)
  return (
    runWatch.test(code) ||
    checksWatch.test(code) ||
    outermostLoops(code).some(
      (loop) => commandSleep.test(loop) || totalSleepSeconds(loop) > 0
    ) ||
    totalSleepSeconds(code) > MAX_SLEEP_SECONDS
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
