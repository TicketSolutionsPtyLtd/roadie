import { readFileSync } from 'node:fs'

const MAX_SLEEP_SECONDS = 10
const UNIT_SECONDS = { '': 1, s: 1, m: 60, h: 3600, d: 86400 }

// Any sleep word, not only one starting a command, since `timeout 60 sleep 90`
// and `/bin/sleep 90` wait too. Arguments end at a redirect or comment.
const sleepCall = /\bsleep((?:[ \t]+[^\s;&|)\x60<>#]+)+)/g
const loop = /\b(?:for|while|until)\s[\s\S]*\bdone\b/
const sleepWord = /\bsleep\s/
const runWatch = /\bgh\s[^\n;&|]*?\brun\s+watch\b/
const checksWatch = /\bgh\s[^\n;&|]*?\bpr\s+checks\b[^\n;&|]*?\s--watch\b/

const shellScript =
  /\b(?:ba|z)?sh\s+(?:-\w+\s+)*-\w*c\w*\s+(?:'([^']*)'|"((?:\\.|[^"\\])*)")/g

// Quoted text and heredoc bodies are data (commit messages, PR bodies), not
// commands, so a message that mentions `gh run watch` isn't blocked. A script
// passed to `sh -c` is code, so it stays.
function stripLiterals(command) {
  return command
    .replace(/<<-?\s*(['"]?)(\w+)\1[^\n]*\n[\s\S]*?\n\s*\2(?=\n|$)/g, '\n')
    .replace(shellScript, (_, single, double) => single ?? double)
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

function ciPollingFound(command) {
  const code = stripLiterals(command)
  const loopText = loop.exec(code)?.[0] ?? ''
  if (
    runWatch.test(code) ||
    checksWatch.test(code) ||
    sleepWord.test(loopText)
  ) {
    return true
  }
  return [...code.matchAll(sleepCall)].some(
    ([, args]) => sleepSeconds(args) > MAX_SLEEP_SECONDS
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
      `To wait on something local, use Monitor or a run_in_background command. Sleeps of ${MAX_SLEEP_SECONDS} seconds or less are allowed (skills/shepherd/SKILL.md, step 3).`
    ].join(' ')
  )
  process.exit(2)
}
