#!/usr/bin/env node
// The pre-push hook: guards, formatting, typecheck, and the tests related to
// the diff, each but the build within a time budget. CI runs the full
// affected suites.
// Usage: node scripts/pre-push.mjs (ROADIE_PRE_PUSH_BASE picks the base, origin/main by default)
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { constants } from 'node:os'
import { join } from 'node:path'

import { killGroup, repoRoot, waitForLoad } from './lib/machine.mjs'
import {
  installedEngines,
  planPrePush,
  readWorkspaces
} from './lib/pre-push-plan.mjs'
import { runStep } from './lib/pre-push-run.mjs'

const base = process.env.ROADIE_PRE_PUSH_BASE || 'origin/main'
const loadWaitS = Number(process.env.ROADIE_PRE_PUSH_LOAD_WAIT_S ?? 15)
const slowS = 20
const started = Date.now()

const git = (...args) =>
  spawnSync('git', args, { cwd: repoRoot, encoding: 'utf8' })

const seconds = (ms) => `${(ms / 1000).toFixed(1)}s`

function pushedShas() {
  if (process.stdin.isTTY) return []
  let input = ''
  try {
    input = readFileSync(0, 'utf8')
  } catch {
    return []
  }
  return input
    .split('\n')
    .map((line) => line.split(' ')[1])
    .filter(Boolean)
}

const shas = pushedShas()
const ZERO = /^0+$/
if (shas.length && shas.every((sha) => ZERO.test(sha))) process.exit(0)

if (git('rev-parse', '--verify', '--quiet', base).status !== 0) {
  console.error(
    `pre-push: no ${base} to diff with. Fetch it first, as \`git fetch ${base.replace('/', ' ')}\`.`
  )
  process.exit(1)
}

const sharesHistory = (sha) => git('merge-base', base, sha).status === 0
const live = shas.filter((sha) => !ZERO.test(sha))
if (live.length && !live.some(sharesHistory)) {
  console.log(
    `pre-push: nothing in common with ${base} (an orphan branch), so nothing to check.`
  )
  process.exit(0)
}

const changedSinceBase = git(
  'diff',
  '--name-only',
  '--no-renames',
  `${base}...HEAD`
)
  .stdout.split('\n')
  .filter(Boolean)
const exists = (file) => existsSync(join(repoRoot, file))
const files = changedSinceBase.filter(exists)
const deleted = changedSinceBase.filter((file) => !exists(file))

const { workspaces, testFiles, guards } = readWorkspaces(repoRoot)

const cacheDir = join(repoRoot, 'node_modules', '.cache', 'roadie-pre-push')
mkdirSync(cacheDir, { recursive: true })
const { steps, skipped } = planPrePush({
  files,
  deleted,
  base,
  workspaces,
  testFiles,
  guards,
  cacheDir,
  engines: installedEngines(repoRoot)
})

console.log(
  `pre-push: ${changedSinceBase.length} ${changedSinceBase.length === 1 ? 'file' : 'files'} changed since ${base}. Checking ${steps.map(({ label }) => label).join(', ')}.`
)

if (!process.env.CI && loadWaitS > 0) {
  const waitStarted = Date.now()
  try {
    await waitForLoad({ maxWaitMs: loadWaitS * 1000, pollMs: 5000 })
    if (Date.now() - waitStarted > 1000)
      console.log(
        `pre-push: waited ${seconds(Date.now() - waitStarted)} for the load.`
      )
  } catch {
    console.warn(
      `pre-push: the machine is still busy after ${loadWaitS}s. Checking anyway.`
    )
  }
}
// The hook has waited already, and test:gated would wait again for up to 30 minutes.
const childEnv = { ...process.env, ROADIE_LOAD_LIMIT: 'Infinity' }
if (process.stdout.isTTY) childEnv.FORCE_COLOR = '1'

let running = null
// Each step runs in its own process group, out of reach of the terminal's Ctrl-C.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    if (running) killGroup(running.pid, signal)
    process.exit(128 + constants.signals[signal])
  })
}

const unfinished = []
for (const step of steps) {
  const stepStarted = Date.now()
  const { outcome, failure } = await runStep(step, {
    env: childEnv,
    onChild: (child) => (running = child)
  })
  const took = Date.now() - stepStarted
  if (outcome === 'unfinished') unfinished.push(step)
  const mark = { passed: '✓', failed: '✗', unfinished: '…' }[outcome]
  const slow = outcome === 'passed' && took > slowS * 1000 ? ' (slow)' : ''
  console.log(`  ${mark} ${step.label} ${seconds(took)}${slow}`)
  if (failure) {
    console.error(`\n${failure.output.trimEnd()}\n`)
    console.error(
      `pre-push: ${step.label} failed. Rerun: ${step.rerun ?? failure.command.join(' ')}`
    )
    console.error(`pre-push: stopped after ${seconds(Date.now() - started)}.`)
    process.exit(1)
  }
}

for (const step of unfinished)
  console.warn(
    `pre-push: ${step.label} passed its ${step.budgetS}s budget, so it wasn't checked here. Run: ${step.rerun ?? step.commands.map((command) => command.join(' ')).join(' && ')}`
  )

if (skipped.length) {
  console.log('pre-push: left to CI, or run them yourself:')
  for (const line of skipped) console.log(`  - ${line}`)
}
console.log(`pre-push: done in ${seconds(Date.now() - started)}.`)
