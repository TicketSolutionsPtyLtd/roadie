import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, rmSync } from 'node:fs'
import { join, sep } from 'node:path'

import { freeDiskGb, repoRoot, run, warnIfLowDisk } from './lib/machine.mjs'

const remove = process.argv.includes('--delete')
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
  return run('git', ['worktree', 'list', '--porcelain'], { cwd: repoRoot })
    .split('\n\n')
    .map((block) => {
      const fields = Object.fromEntries(
        block.split('\n').map((line) => {
          const [key, ...rest] = line.split(' ')
          return [key, rest.join(' ') || true]
        })
      )
      return {
        path: fields.worktree,
        head: fields.HEAD,
        branch:
          typeof fields.branch === 'string'
            ? fields.branch.replace('refs/heads/', '')
            : null,
        locked: Boolean(fields.locked)
      }
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
          '500',
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

function keepReason(tree) {
  if (!tree.branch) return 'detached HEAD'
  if (tree.locked) return 'locked'
  if (here === tree.path || here.startsWith(tree.path + sep))
    return 'current directory'
  if (inUse(tree.path)) return 'a process is running in it'
  const isMerged = merged.some(
    (pr) =>
      pr.headRefName === tree.branch &&
      isAncestor(tree.head, pr.headRefOid, tree.path)
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

const cwds = processCwds()
const inUse = (dir) =>
  cwds.some((cwd) => cwd === dir || cwd.startsWith(dir + sep))
const sessionPrefix = process.env.ROADIE_BRANCH_PREFIX
const [mainCheckout, ...allLinked] = worktrees()
const linked = sessionPrefix
  ? allLinked.filter((tree) => tree.branch?.startsWith(sessionPrefix))
  : allLinked
const cacheOwners = sessionPrefix ? linked : [mainCheckout, ...linked]
const here = process.cwd()
const merged = mergedPullRequests()

console.log(`Free disk: ${freeDiskGb().toFixed(1)} GB`)
warnIfLowDisk()

console.log('\nNext caches of servers that are not running')
if (sessionPrefix)
  console.log(
    `Only worktrees on ${sessionPrefix} branches; the main checkout is left alone.`
  )
for (const { path } of cacheOwners) {
  const cache = join(path, 'docs', '.next')
  if (!existsSync(cache)) continue
  const kb = sizeKb(cache)
  if (inUse(join(path, 'docs'))) {
    console.log(
      `  Kept ${cache} (${formatKb(kb)}), a process is running in docs`
    )
    continue
  }
  if (remove) rmSync(cache, { recursive: true, force: true })
  reclaimedKb += kb
  console.log(`  ${verb} ${cache} (${formatKb(kb)})`)
}

console.log('\nWorktrees whose branch is merged and clean')
for (const tree of linked) {
  const reason = keepReason(tree)
  if (reason) {
    console.log(`  Kept ${tree.path} (${reason})`)
    continue
  }
  const kb = sizeKb(tree.path)
  if (remove) run('git', ['worktree', 'remove', tree.path], { cwd: repoRoot })
  reclaimedKb += kb
  console.log(`  ${verb} ${tree.path} [${tree.branch}] (${formatKb(kb)})`)
}

console.log('\npnpm store')
if (remove) {
  execFileSync('pnpm', ['store', 'prune'], { cwd: repoRoot, stdio: 'inherit' })
  console.log('  Pruned unreferenced packages')
} else {
  console.log('  Would run pnpm store prune')
}

console.log(
  `\n${verb} ${formatKb(reclaimedKb)}, plus what the store prune frees.`
)
if (!remove) console.log('Run `pnpm cleanup --delete` to delete.')
