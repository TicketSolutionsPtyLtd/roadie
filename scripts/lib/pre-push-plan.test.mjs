import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, test } from 'node:test'

import { repoRoot } from './machine.mjs'
import {
  incrementalTypecheck,
  isGuardTest,
  planPrePush,
  readWorkspaces
} from './pre-push-plan.mjs'

const repo = readWorkspaces(repoRoot)
const plan = (files) => planPrePush({ ...repo, files, cacheDir: '/cache' })
const commandsOf = (kind, { steps }) =>
  steps.filter((step) => step.kind === kind).flatMap((step) => step.commands)
const labelsOf = (kind, result) =>
  result.steps.filter((step) => step.kind === kind).map(({ label }) => label)

const DIFFS = {
  component: ['packages/components/src/components/Badge/index.tsx'],
  core: ['packages/core/src/utils/cn.ts'],
  docs: ['docs/src/app/components/badge/page.mdx'],
  lockfile: ['pnpm-lock.yaml']
}

describe('the pre-push hook', () => {
  test('runs only scripts/pre-push.mjs and the size warning', () => {
    const hook = readFileSync(join(repoRoot, '.husky/pre-push'), 'utf8')
    const commands = hook.split('\n').filter((line) => line.trim())
    assert.deepEqual(commands, [
      'node scripts/pre-push.mjs "$@" || exit 1',
      'node scripts/check-pr-size.mjs || true'
    ])
  })

  for (const [name, files] of Object.entries(DIFFS)) {
    test(`never runs a whole suite for a ${name} change`, () => {
      for (const command of plan(files).steps.flatMap(
        (step) => step.commands
      )) {
        const line = command.join(' ')
        assert.doesNotMatch(line, /turbo run (?:\S+ )*(?:test|typecheck)\b/)
        assert.doesNotMatch(line, /--affected|--all\b|vitest run/)
        if (command.includes('scripts/test-gated.mjs')) {
          const files = command.slice(
            3,
            command.findIndex((arg) => arg.startsWith('-'))
          )
          assert.ok(files.length > 0, `${line} names its test files first`)
          for (const file of files) assert.match(file, /\.test\.[cm]?[jt]sx?$/)
        }
      }
    })
  }

  test('a component change typechecks components and runs its own test', () => {
    const result = plan(DIFFS.component)
    assert.deepEqual(labelsOf('typecheck', result), ['typecheck components'])
    const [tests] = commandsOf('tests', result)
    assert.ok(tests.includes('src/components/Badge/Badge.test.tsx'))
    assert.ok(tests.includes('--project') && tests.includes('jsdom'))
    assert.ok(
      result.skipped.some((line) =>
        line.includes('pnpm test:gated components --all')
      )
    )
  })

  test('a charts change runs the engine-free guard', () => {
    const [tests] = commandsOf(
      'tests',
      plan(['packages/charts/src/LineChart/index.tsx'])
    )
    assert.ok(tests.includes('src/Chart/engine-free.test.ts'))
  })

  test('a docs change builds every package docs reads before its typecheck', () => {
    const result = plan(DIFFS.docs)
    assert.deepEqual(labelsOf('typecheck', result), ['typecheck docs'])
    assert.deepEqual(commandsOf('build', result), [
      [
        'pnpm',
        'turbo',
        'run',
        'build',
        '--output-logs=errors-only',
        '--filter=docs^...'
      ]
    ])
  })

  test('a root config change typechecks every workspace', () => {
    assert.equal(
      labelsOf('typecheck', plan(DIFFS.lockfile)).length,
      repo.workspaces.filter(({ scripts }) => scripts.typecheck).length
    )
  })

  test('every step has a time budget', () => {
    for (const files of Object.values(DIFFS))
      for (const step of plan(files).steps)
        assert.ok(step.budgetS > 0, `${step.label} has a budget`)
  })
})

describe('incrementalTypecheck', () => {
  test('gives each tsc its own build-info file', () => {
    assert.deepEqual(
      incrementalTypecheck(
        'tsc --noEmit -p tsconfig.test.json && tsc --noEmit -p scripts/manifest',
        '/cache/core'
      ),
      [
        {
          bin: 'tsc',
          args: [
            '--noEmit',
            '-p',
            'tsconfig.test.json',
            '--incremental',
            '--tsBuildInfoFile',
            '/cache/core-0.tsbuildinfo'
          ]
        },
        {
          bin: 'tsc',
          args: [
            '--noEmit',
            '-p',
            'scripts/manifest',
            '--incremental',
            '--tsBuildInfoFile',
            '/cache/core-1.tsbuildinfo'
          ]
        }
      ]
    )
  })

  test('leaves a script that runs anything else as written', () => {
    assert.equal(incrementalTypecheck('node check.mjs && tsc', '/c'), null)
  })

  test('parses every workspace typecheck script', () => {
    for (const { short, scripts } of repo.workspaces)
      assert.notEqual(
        incrementalTypecheck(scripts.typecheck, '/c'),
        null,
        `${short}'s typecheck runs incrementally`
      )
  })
})

describe('isGuardTest', () => {
  const readsFs = () => "import { readFileSync } from 'node:fs'"
  test('is a jsdom test that reads files', () => {
    assert.equal(isGuardTest('src/a.test.ts', readsFs), true)
    assert.equal(
      isGuardTest('src/a.test.ts', () => "import a from './a'"),
      false
    )
    assert.equal(isGuardTest('src/a.browser.test.tsx', readsFs), false)
    assert.equal(isGuardTest('src/a.ts', readsFs), false)
  })
})
