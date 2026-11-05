// What the pre-push hook runs for a diff: only what the diff touches, so a
// one-package push stays well under a minute. CI runs the full affected suites.
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import { projectsIn } from './ci-projects.mjs'

// Root files every package reads, so a change to one typechecks them all.
const GLOBAL_FILE =
  /^(?:tsconfig[^/]*\.json|package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml|vitest\.browsers\.config\.ts|\.nvmrc)$/
const SOURCE = /\.(?:[cm]?[jt]sx?|css|vue)$/
const TEST = /\.test\.[cm]?[jt]sx?$/
const NOT_JSDOM = /\.(?:browser|e2e|perf)\.test\./
// core's vitest config runs these folders' tests, and its parity guards read skills/.
const TESTED_BY_CORE = /^(?:eslint|skills)\//
const FORMATTED = /\.(?:[cm]?[jt]sx?|json|jsonc|css|ya?ml|md|mdx|vue|html)$/

// No budget for the build: tsdown empties dist first, so stopping it midway
// breaks the preview and dev server until the next full build.
export const BUDGET_S = {
  guards: 60,
  format: 30,
  build: null,
  typecheck: 90,
  tests: 120
}

/** A guard reads source with node:fs instead of importing it, so vitest's related mode never picks it. */
export const isGuardTest = (path, readSource) =>
  TEST.test(path) &&
  !NOT_JSDOM.test(path) &&
  /from ['"](?:node:)?fs(?:\/promises)?['"]/.test(readSource(path))

// Windows runs pnpm through cmd.exe, which stops at 8191 characters.
const MAX_ARGS_LENGTH = 6000

function inBatches(paths) {
  const batches = [[]]
  let length = 0
  for (const path of paths) {
    if (length + path.length > MAX_ARGS_LENGTH && batches.at(-1).length) {
      batches.push([])
      length = 0
    }
    batches.at(-1).push(path)
    length += path.length + 1
  }
  return batches
}

const count = (n, noun) => `${n} ${noun}${n === 1 ? '' : 's'}`

const folderOf = (path) => path.slice(0, path.lastIndexOf('/') + 1)

const isIn = (file, { dir }) => file.startsWith(`${dir}/`)

/**
 * Each `tsc` or `vue-tsc` in a typecheck script, with a build-info file so the
 * next push rechecks only what changed. Null when the script runs anything
 * else, so the hook runs the script as written.
 */
export function incrementalTypecheck(script, buildInfoPrefix) {
  const commands = script.split('&&').map((part) => part.trim().split(/\s+/))
  if (!commands.every(([bin]) => bin === 'tsc' || bin === 'vue-tsc'))
    return null
  return commands.map(([bin, ...args], index) => ({
    bin,
    args: [
      ...args,
      '--incremental',
      '--tsBuildInfoFile',
      `${buildInfoPrefix}-${index}.tsbuildinfo`
    ]
  }))
}

function dependentsOf(names, workspaces) {
  const found = new Set()
  let grew = true
  while (grew) {
    grew = false
    for (const workspace of workspaces) {
      if (names.has(workspace.name) || found.has(workspace.name)) continue
      if (workspace.deps.some((dep) => names.has(dep) || found.has(dep))) {
        found.add(workspace.name)
        grew = true
      }
    }
  }
  return [...found]
}

/**
 * @param {object} input
 * @param {string[]} input.files repo-relative paths changed since the base, that still exist
 * @param {string[]} [input.deleted] repo-relative paths deleted since the base
 * @param {string} [input.base] the ref the diff is against
 * @param {{ name: string, short: string, dir: string, deps: string[], scripts: Record<string, string> }[]} input.workspaces
 * @param {Record<string, string[]>} input.testFiles package-relative test files, by short name
 * @param {Record<string, string[]>} input.guards the guard tests among them
 * @param {string} input.cacheDir where the typecheck build-info files go
 */
export function planPrePush({
  files,
  deleted = [],
  base = 'origin/main',
  workspaces,
  testFiles,
  guards,
  cacheDir
}) {
  const changedOrDeleted = [...files, ...deleted]
  const global = changedOrDeleted.some((file) => GLOBAL_FILE.test(file))
  const touched = global
    ? workspaces
    : workspaces.filter((workspace) =>
        changedOrDeleted.some((file) => isIn(file, workspace))
      )
  const touchedNames = new Set(touched.map(({ name }) => name))
  const steps = []
  const skipped = []

  steps.push({
    kind: 'guards',
    label: 'repo guards',
    commands: [
      ['node', 'scripts/check-component-docs.mjs'],
      ['node', 'scripts/check-docs-content.mjs'],
      ['node', '--test', 'scripts/**/*.test.mjs', '.claude/hooks/*.test.mjs']
    ]
  })

  const formatted = files.filter((file) => FORMATTED.test(file))
  if (formatted.length)
    steps.push({
      kind: 'format',
      label: `formatting (${count(formatted.length, 'file')})`,
      rerun: 'pnpm format',
      commands: inBatches(formatted).map((batch) => [
        'pnpm',
        'exec',
        'oxfmt',
        '--check',
        '--no-error-on-unmatched-pattern',
        ...batch
      ])
    })

  const typechecked = touched.filter(({ scripts }) => scripts.typecheck)
  const built = typechecked.filter(({ deps }) =>
    deps.some((dep) => workspaces.some(({ name }) => name === dep))
  )
  if (built.length)
    steps.push({
      kind: 'build',
      label: 'build what the typecheck reads',
      commands: [
        [
          'pnpm',
          'turbo',
          'run',
          'build',
          '--output-logs=errors-only',
          ...built.map(({ name }) => `--filter=${name}^...`)
        ]
      ]
    })

  for (const workspace of typechecked) {
    const incremental = incrementalTypecheck(
      workspace.scripts.typecheck,
      `${cacheDir}/${workspace.short}`
    )
    steps.push({
      kind: 'typecheck',
      label: `typecheck ${workspace.short}`,
      rerun: `pnpm --filter ${workspace.name} typecheck`,
      cwd: workspace.dir,
      commands: incremental
        ? incremental.map(({ bin, args }) => ['pnpm', 'exec', bin, ...args])
        : [['pnpm', 'run', 'typecheck']]
    })
  }

  const core = workspaces.find(({ short }) => short === 'core')
  const tested =
    core &&
    !touched.includes(core) &&
    changedOrDeleted.some((file) => TESTED_BY_CORE.test(file))
      ? [...touched, core]
      : touched

  for (const workspace of tested) {
    if (!workspace.scripts.test) continue
    const inWorkspace = (paths) =>
      paths
        .filter((file) => isIn(file, workspace) && SOURCE.test(file))
        .map((file) => file.slice(workspace.dir.length + 1))
    const changed = inWorkspace(files)
    const changedFolders = new Set(
      [...changed, ...inWorkspace(deleted)].map(folderOf)
    )
    const own = (testFiles[workspace.short] ?? []).filter(
      (test) =>
        !NOT_JSDOM.test(test) &&
        (changed.includes(test) || changedFolders.has(folderOf(test)))
    )
    const guardFiles = (guards[workspace.short] ?? []).filter(
      (test) => !own.includes(test)
    )
    if (own.length + guardFiles.length === 0) continue
    const projects = projectsIn(workspace.scripts.test)
    const tests = [...own, ...guardFiles]
    const projectArgs = projects.flatMap((project) => ['--project', project])
    steps.push({
      kind: 'tests',
      label: `tests ${workspace.short} (${own.length} beside the change, ${count(guardFiles.length, 'guard')})`,
      rerun: `pnpm test:gated ${[workspace.short, ...tests, ...projectArgs].join(' ')}`,
      commands: [
        [
          'node',
          'scripts/test-gated.mjs',
          workspace.short,
          // test:gated reads the arguments before the first flag as files.
          ...tests,
          '--passWithNoTests',
          ...projectArgs
        ]
      ]
    })
    const changedSource = changed.filter((file) => !TEST.test(file))
    if (changedSource.length)
      skipped.push(
        `tests elsewhere in ${workspace.short} that import the change, and its browser tests: pnpm test:gated ${workspace.short} ${changedSource.join(' ')}`
      )
    skipped.push(
      `the whole ${workspace.short} suite: pnpm test:gated ${workspace.short} --all`
    )
  }

  const dependents = global ? [] : dependentsOf(touchedNames, workspaces)
  if (dependents.length) {
    const shorts = dependents.map(
      (name) => workspaces.find((workspace) => workspace.name === name).short
    )
    skipped.push(
      `typecheck and tests of dependents (${shorts.join(', ')}): pnpm turbo run typecheck test --filter="...[${base}]"`
    )
  }

  for (const step of steps) step.budgetS = BUDGET_S[step.kind]
  return { steps, skipped }
}

/** Each workspace with its workspace dependencies, tracked test files, and guards. */
export function readWorkspaces(root) {
  const dirs = [
    ...readdirSync(join(root, 'packages')).map((name) => `packages/${name}`),
    'docs'
  ].filter((dir) => existsSync(join(root, dir, 'package.json')))
  const manifests = dirs.map((dir) => ({
    dir,
    json: JSON.parse(readFileSync(join(root, dir, 'package.json'), 'utf8'))
  }))
  const names = new Set(manifests.map(({ json }) => json.name))
  const workspaces = manifests.map(({ dir, json }) => ({
    name: json.name,
    short: dir.split('/').at(-1),
    dir,
    scripts: json.scripts ?? {},
    deps: Object.keys({
      ...json.dependencies,
      ...json.devDependencies,
      ...json.peerDependencies
    }).filter((dep) => names.has(dep) && dep !== json.name)
  }))
  const tracked = spawnSync('git', ['ls-files', '--', ...dirs], {
    cwd: root,
    encoding: 'utf8'
  }).stdout.split('\n')
  const testFiles = {}
  const guards = {}
  for (const { short, dir } of workspaces) {
    testFiles[short] = tracked
      .filter(
        (file) =>
          file.startsWith(`${dir}/`) &&
          TEST.test(file) &&
          existsSync(join(root, file))
      )
      .map((file) => file.slice(dir.length + 1))
    guards[short] = testFiles[short].filter((file) =>
      isGuardTest(file, () => readFileSync(join(root, dir, file), 'utf8'))
    )
  }
  return { workspaces, testFiles, guards }
}
