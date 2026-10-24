import { spawn } from 'node:child_process'
import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs'
import { availableParallelism, constants } from 'node:os'
import { isAbsolute, join, relative, resolve, sep } from 'node:path'

import { gatedProjects } from './lib/ci-projects.mjs'
import {
  killGroup,
  repoRoot,
  waitForLoad,
  warnIfLowDisk
} from './lib/machine.mjs'

const PACKAGES = [
  'core',
  'components',
  'charts',
  'editor',
  'widgets',
  'lint-plugin',
  'docs'
]
const usage = `Usage: pnpm test:gated <${PACKAGES.join('|')}> [files] [--all] [--all-browsers] [--perf] [vitest args]
Runs the tests related to the files or folders given, or to the changes since origin/main,
in the projects CI runs (the package's test and test:browser scripts).
--all runs the whole suite, --all-browsers runs WebKit and Firefox too.
--perf runs the package's test:perf projects instead, as do perf test files given alone.
--project picks the projects yourself.
Example: pnpm test:gated components src/components/Badge/index.tsx --project 'browser*'`

const timeoutMin = Number(process.env.ROADIE_TEST_TIMEOUT_MIN) || 10
const [pkg, ...rest] = process.argv.slice(2)

if (!PACKAGES.includes(pkg)) {
  console.error(usage)
  process.exit(2)
}

const cwd =
  pkg === 'docs' ? join(repoRoot, 'docs') : join(repoRoot, 'packages', pkg)

if (!existsSync(join(cwd, 'package.json'))) {
  console.error(usage)
  process.exit(2)
}

const all = rest.includes('--all')
const allBrowsers = rest.includes('--all-browsers')
const perf = rest.includes('--perf')
const passThrough = rest.filter(
  (arg) => arg !== '--all' && arg !== '--all-browsers' && arg !== '--perf'
)
const firstFlag = passThrough.findIndex((arg) => arg.startsWith('-'))
const fileArgs =
  firstFlag === -1 ? passThrough : passThrough.slice(0, firstFlag)
const vitestArgs = firstFlag === -1 ? [] : passThrough.slice(firstFlag)

function packageRelative(arg) {
  const inPackage = [resolve(cwd, arg), resolve(repoRoot, arg)]
    .map((path) => relative(cwd, path))
    .find(
      (path) =>
        !path.startsWith('..') &&
        !isAbsolute(path) &&
        existsSync(join(cwd, path))
    )
  if (inPackage !== undefined) return inPackage
  console.error(`No such file in ${pkg}: ${arg}\n\n${usage}`)
  process.exit(2)
}

if (vitestArgs.some((arg) => arg.startsWith('--maxWorkers'))) {
  console.error('test:gated sets --maxWorkers itself, to half the cores.')
  process.exit(2)
}

const SOURCE = /\.(?:[cm]?[jt]sx?|css)$/
const SKIPPED_FOLDER = /^(?:\..*|node_modules|dist|coverage)$/

function sourceFilesIn(folder) {
  return readdirSync(join(cwd, folder), { withFileTypes: true }).flatMap(
    (entry) => {
      const path = join(folder, entry.name)
      if (entry.isDirectory()) {
        return SKIPPED_FOLDER.test(entry.name) ? [] : sourceFilesIn(path)
      }
      return entry.isFile() && SOURCE.test(entry.name) ? [path] : []
    }
  )
}

function withFolderContents(path) {
  const stats = lstatSync(join(cwd, path))
  if (!stats.isDirectory() && !stats.isSymbolicLink()) return [path]
  const skipped =
    stats.isSymbolicLink() ||
    path.split(sep).some((name) => SKIPPED_FOLDER.test(name))
  const files = skipped ? [] : sourceFilesIn(path)
  if (files.length) return files
  console.error(`No source files in ${pkg}: ${path || '.'}\n\n${usage}`)
  process.exit(2)
}

const files = fileArgs.map(packageRelative).flatMap(withFolderContents)
const { scripts = {} } = JSON.parse(
  readFileSync(join(cwd, 'package.json'), 'utf8')
)
const projects = gatedProjects({ scripts, files, perf, vitestArgs })
if (!projects) {
  console.error(`${pkg} has no test:perf script.\n\n${usage}`)
  process.exit(2)
}

const maxWorkers = Math.max(1, Math.floor(availableParallelism() / 2))

const callerSetsNoTests = vitestArgs.some((arg) =>
  arg.startsWith('--passWithNoTests')
)

const selection = all
  ? ['run']
  : files.length
    ? [
        'related',
        '--run',
        ...(callerSetsNoTests ? [] : ['--passWithNoTests=false']),
        ...files
      ]
    : ['run', '--changed', 'origin/main']

warnIfLowDisk()
await waitForLoad()

const args = [
  'exec',
  'vitest',
  ...selection,
  ...projects.projectArgs,
  `--maxWorkers=${maxWorkers}`,
  ...vitestArgs
]
const env = {
  ...process.env,
  ...projects.env,
  ROADIE_BROWSERS: allBrowsers
    ? 'chromium,webkit,firefox'
    : process.env.ROADIE_BROWSERS || 'chromium'
}
const shownEnv = Object.entries({
  ...projects.env,
  ROADIE_BROWSERS: env.ROADIE_BROWSERS
}).map(([name, value]) => `${name}=${value}`)
console.log(
  `${shownEnv.join(' ')} pnpm ${args.join(' ')} (in ${pkg}, ${timeoutMin} min limit)`
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
