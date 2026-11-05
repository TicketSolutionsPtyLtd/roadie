import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, rmSync } from 'node:fs'
import { join, sep } from 'node:path'
import { parseArgs } from 'node:util'

import {
  changedSinceCheck,
  isStaleLock,
  mergedHead,
  parseWorktrees,
  planBranches
} from './lib/cleanup-plan.mjs'
import { freeDiskGb, repoRoot, run, warnIfLowDisk } from './lib/machine.mjs'

// `pnpm cleanup -- --delete` passes the `--` through.
const argv = process.argv.slice(2)
let flags
try {
  flags = parseArgs({
    args: argv[0] === '--' ? argv.slice(1) : argv,
    options: { delete: { type: 'boolean' }, branch: { type: 'string' } }
  }).values
} catch (error) {
  console.error(
    `${error.message}\nUsage: pnpm cleanup [--delete] [--branch <branch>]`
  )
  process.exit(1)
}
const remove = Boolean(flags.delete)
const onlyBranch = flags.branch
const verb = remove ? 'Removed' : 'Would remove'
let reclaimedKb = 0

function sizeKb(path) {
  return Number(run('du', ['-sk', path]).split('\t')[0])
}

function formatKb(kb) {
  return kb < 1024 ** 2
    ? `${Math.round(kb / 1024)} MB`
    : `${(kb / 1024 ** 2).toFixed(1)} GB`
}

function processCwds() {
  return spawnSync('lsof', ['-d', 'cwd', '-Fn'], { encoding: 'utf8' })
    .stdout.split('\n')
    .filter((line) => line.startsWith('n'))
    .map((line) => line.slice(1))
}

function worktrees() {
  return parseWorktrees(
    run('git', ['worktree', 'list', '--porcelain'], { cwd: repoRoot })
  )
}

function localBranches() {
  return run(
    'git',
    [
      'for-each-ref',
      '--sort=committerdate',
      '--format=%(refname:short) %(objectname) %(committerdate:short)',
      'refs/heads'
    ],
    { cwd: repoRoot }
  )
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [name, tip, date] = line.split(' ')
      return { name, tip, date }
    })
}

function mergedPullRequests() {
  try {
    return JSON.parse(
      run(
        'gh',
        [
          'pr',
          'list',
          '--state',
          'merged',
          '--limit',
          '1000',
          '--json',
          'headRefName,headRefOid'
        ],
        {
          cwd: repoRoot
        }
      )
    )
  } catch {
    console.warn(
      'Could not list merged pull requests with gh, so no worktree counts as merged.'
    )
    return []
  }
}

function isAncestor(commit, of, cwd) {
  try {
    run('git', ['merge-base', '--is-ancestor', commit, of], {
      cwd,
      stdio: 'ignore'
    })
    return true
  } catch {
    return false
  }
}

function hasCommit(commit) {
  try {
    run('git', ['cat-file', '-e', `${commit}^{commit}`], {
      cwd: repoRoot,
      stdio: 'ignore'
    })
    return true
  } catch {
    return false
  }
}

const buildOutputNames = new Set([
  'node_modules',
  '.next',
  'dist',
  'out',
  '.turbo',
  'coverage',
  'test-results'
])
const generatedPaths = new Set([
  '.husky/_',
  'docs/next-env.d.ts',
  'packages/core/src/tokens/tokens.json'
])

function isBuildOutput(path) {
  const trimmed = path.replace(/\/$/, '')
  return (
    generatedPaths.has(trimmed) ||
    buildOutputNames.has(trimmed.split('/').pop()) ||
    trimmed.endsWith('.tsbuildinfo')
  )
}

function isRunning(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return error.code === 'EPERM'
  }
}

function keepReason(tree) {
  if (!tree.branch) return 'detached HEAD'
  if (tree.locked && !isStaleLock(tree, isRunning)) return 'locked'
  if (here === tree.path || here.startsWith(tree.path + sep))
    return 'current directory'
  if (inUse(tree.path)) return 'a process is running in it'
  const isMerged = mergedHead(tree.branch, tree.head, merged, (commit, of) =>
    isAncestor(commit, of, tree.path)
  )
  if (!isMerged) return 'not merged'
  const status = run('git', ['status', '--porcelain', '--ignored'], {
    cwd: tree.path
  })
    .split('\n')
    .filter(Boolean)
  if (status.some((line) => !line.startsWith('!!')))
    return 'uncommitted changes'
  const keptIgnored = status
    .map((line) => line.slice(3))
    .find((path) => !isBuildOutput(path))
  if (keptIgnored) return `ignored ${keptIgnored} would be lost`
  return null
}

function reasonSinceCheck(tree) {
  const changed = changedSinceCheck(tree, worktrees())
  if (changed) return changed
  const dir = tree.path
  const startedSince = processCwds().some(
    (cwd) => cwd === dir || cwd.startsWith(dir + sep)
  )
  return startedSince ? 'a process started in it since the check' : null
}

// Only a stale lock gets this far, but if git refuses the removal the lock
// goes back, so a failed run leaves the worktree as it found it.
function removeWorktree(tree) {
  const worktree = (...args) =>
    run('git', ['worktree', ...args], { cwd: repoRoot })
  if (tree.locked) worktree('unlock', tree.path)
  try {
    worktree('remove', tree.path)
  } catch (error) {
    if (tree.locked) worktree('lock', '--reason', tree.lockReason, tree.path)
    throw error
  }
}

const cwds = processCwds()
const inUse = (dir) =>
  cwds.some((cwd) => cwd === dir || cwd.startsWith(dir + sep))
const sessionPrefix = process.env.ROADIE_BRANCH_PREFIX
const [mainCheckout, ...registered] = worktrees()
const inScope = (tree) =>
  (!sessionPrefix || tree.branch?.startsWith(sessionPrefix)) &&
  (!onlyBranch || tree.branch === onlyBranch)
const prunable = registered.filter((tree) => tree.prunable && inScope(tree))
const linked = registered.filter((tree) => !tree.prunable && inScope(tree))
const cacheOwners =
  sessionPrefix || onlyBranch ? linked : [mainCheckout, ...linked]
const here = process.cwd()
const merged = mergedPullRequests()
const keepReasons = new Map(linked.map((tree) => [tree, keepReason(tree)]))
const removable = new Set(
  linked.filter((tree) => !keepReasons.get(tree)).map((tree) => tree.path)
)

console.log(`Free disk: ${freeDiskGb().toFixed(1)} GB`)
warnIfLowDisk()

console.log('\nNext caches of servers that are not running')
if (sessionPrefix)
  console.log(
    `Only worktrees on ${sessionPrefix} branches; the main checkout is left alone.`
  )
for (const { path } of cacheOwners) {
  if (removable.has(path)) continue
  const cache = join(path, 'docs', '.next')
  if (!existsSync(cache)) continue
  const kb = sizeKb(cache)
  if (inUse(path)) {
    console.log(
      `  Kept ${cache} (${formatKb(kb)}), a process is running in its worktree`
    )
    continue
  }
  if (remove) rmSync(cache, { recursive: true, force: true })
  reclaimedKb += kb
  console.log(`  ${verb} ${cache} (${formatKb(kb)})`)
}

console.log('\nWorktrees whose branch is merged and clean')
for (const tree of linked) {
  const reason = keepReasons.get(tree)
  if (reason) {
    console.log(`  Kept ${tree.path} (${reason})`)
    continue
  }
  const lateReason = remove && reasonSinceCheck(tree)
  if (lateReason) {
    console.log(`  Kept ${tree.path} (${lateReason})`)
    continue
  }
  const kb = sizeKb(tree.path)
  if (remove) removeWorktree(tree)
  reclaimedKb += kb
  console.log(`  ${verb} ${tree.path} [${tree.branch}] (${formatKb(kb)})`)
}

// One entry at a time, since `git worktree prune` would also drop entries
// outside the prefix or branch asked for.
console.log('\nWorktree entries whose folder is gone')
for (const tree of prunable) {
  if (remove) run('git', ['worktree', 'remove', tree.path], { cwd: repoRoot })
  console.log(`  ${verb} ${tree.path}`)
}

const released = new Set([...removable, ...prunable.map((tree) => tree.path)])
const checkedOut = new Set(
  [mainCheckout, ...registered]
    .filter((tree) => tree.branch && !released.has(tree.path))
    .map((tree) => tree.branch)
)
const branches = localBranches()
const lastCommit = new Map(branches.map(({ name, date }) => [name, date]))
const branchPlan = planBranches({
  branches,
  checkedOut,
  merged,
  isAncestor: (commit, of) => isAncestor(commit, of, repoRoot),
  hasCommit,
  only: onlyBranch,
  prefix: sessionPrefix
})

console.log('\nLocal branches whose merged PR holds every commit')
for (const name of branchPlan.remove) {
  if (remove) run('git', ['branch', '-D', name], { cwd: repoRoot })
  console.log(`  ${verb} ${name}`)
}

// Never deleted: these may hold work. They're listed oldest first so a person
// can decide, and the helper branches a session forgot are easy to spot.
for (const reason of [
  'commits its merged PR lacks',
  'a merged PR head not fetched',
  'no merged PR'
]) {
  const names = branchPlan.kept
    .filter((branch) => branch.reason === reason)
    .map((branch) => branch.name)
  if (!names.length) continue
  const noun = names.length === 1 ? 'branch' : 'branches'
  console.log(`\nKept: ${names.length} local ${noun} with ${reason}`)
  for (const name of names) console.log(`  ${lastCommit.get(name)}  ${name}`)
}

if (!onlyBranch) {
  console.log('\npnpm store')
  if (remove) {
    execFileSync('pnpm', ['store', 'prune'], {
      cwd: repoRoot,
      stdio: 'inherit'
    })
    console.log('  Pruned unreferenced packages')
  } else {
    console.log('  Would run pnpm store prune')
  }
}

const storeNote = onlyBranch ? '' : ', plus what the store prune frees'
console.log(`\n${verb} ${formatKb(reclaimedKb)}${storeNote}.`)
const branchArg = onlyBranch ? ` --branch ${onlyBranch}` : ''
if (!remove) console.log(`Run \`pnpm cleanup --delete${branchArg}\` to delete.`)
