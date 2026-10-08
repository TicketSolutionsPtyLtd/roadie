import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { availableParallelism, constants } from 'node:os'
import { join, relative } from 'node:path'

import {
  killGroup,
  repoRoot,
  waitForLoad,
  warnIfLowDisk
} from './lib/machine.mjs'

const usage = `Usage: pnpm test:gated <core|components|charts|widgets|docs> [files] [--all] [--all-browsers] [vitest args]
Runs the tests related to the files given, or to the changes since origin/main.
--all runs the whole suite, --all-browsers runs WebKit and Firefox too.
Example: pnpm test:gated components src/components/Badge/index.tsx --project 'browser*'`

const timeoutMin = Number(process.env.ROADIE_TEST_TIMEOUT_MIN) || 10
const [pkg, ...rest] = process.argv.slice(2)
const cwd =
  pkg === 'docs'
    ? join(repoRoot, 'docs')
    : join(repoRoot, 'packages', pkg ?? '')

if (!pkg || !existsSync(join(cwd, 'package.json'))) {
  console.error(usage)
  process.exit(2)
}

const all = rest.includes('--all')
const allBrowsers = rest.includes('--all-browsers')
const passThrough = rest.filter(
  (arg) => arg !== '--all' && arg !== '--all-browsers'
)
const firstFlag = passThrough.findIndex((arg) => arg.startsWith('-'))
const fileArgs =
  firstFlag === -1 ? passThrough : passThrough.slice(0, firstFlag)
const vitestArgs = firstFlag === -1 ? [] : passThrough.slice(firstFlag)

function packageRelative(arg) {
  if (existsSync(join(cwd, arg))) return arg
  const fromRoot = relative(cwd, join(repoRoot, arg))
  if (!fromRoot.startsWith('..') && existsSync(join(cwd, fromRoot)))
    return fromRoot
  console.error(`No such file in ${pkg}: ${arg}\n\n${usage}`)
  process.exit(2)
}

const files = fileArgs.map(packageRelative)
const maxWorkers = Math.max(1, Math.floor(availableParallelism() / 2))

const selection = all
  ? ['run']
  : files.length
    ? ['related', '--run', ...files]
    : ['run', '--changed', 'origin/main']

warnIfLowDisk()
await waitForLoad()

const args = [
  'exec',
  'vitest',
  ...selection,
  `--maxWorkers=${maxWorkers}`,
  ...vitestArgs
]
const env = {
  ...process.env,
  ROADIE_BROWSERS: allBrowsers
    ? 'chromium,webkit,firefox'
    : process.env.ROADIE_BROWSERS || 'chromium'
}
console.log(
  `ROADIE_BROWSERS=${env.ROADIE_BROWSERS} pnpm ${args.join(' ')} (in ${pkg}, ${timeoutMin} min limit)`
)

const child = spawn('pnpm', args, {
  cwd,
  env,
  detached: true,
  stdio: ['ignore', 'inherit', 'inherit']
})

const stopTests = (signal) => killGroup(child.pid, signal)

let timedOut = false
const timer = setTimeout(() => {
  timedOut = true
  console.error(`Tests passed the ${timeoutMin} minute limit. Stopping them.`)
  stopTests('SIGTERM')
  setTimeout(() => stopTests('SIGKILL'), 10_000).unref()
}, timeoutMin * 60_000)

let receivedSignal = null
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    receivedSignal = signal
    stopTests(signal)
    setTimeout(() => stopTests('SIGKILL'), 5_000).unref()
  })
}

child.on('exit', (code, signal) => {
  clearTimeout(timer)
  // Reaps browsers and workers vitest left behind.
  stopTests('SIGKILL')
  if (timedOut) process.exit(124)
  if (receivedSignal) process.exit(128 + constants.signals[receivedSignal])
  process.exit(code ?? (signal ? 1 : 0))
})
