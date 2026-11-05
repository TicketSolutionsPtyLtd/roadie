import assert from 'node:assert/strict'
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, describe, test } from 'node:test'

import { repoRoot } from './machine.mjs'
import {
  ENGINES,
  incrementalTypecheck,
  installedEngines,
  isGuardTest,
  planPrePush,
  readWorkspaces
} from './pre-push-plan.mjs'

const repo = readWorkspaces(repoRoot)
const plan = (files, deleted = []) =>
  planPrePush({ ...repo, files, deleted, cacheDir: '/cache' })
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
    const commands = hook
      .split('\n')
      .filter((line) => line.trim() && !line.startsWith('#'))
    assert.deepEqual(commands, [
      '[ -f scripts/pre-push.mjs ] || { echo "pre-push: this branch predates scripts/pre-push.mjs, so nothing was checked. Rebase on origin/main."; exit 0; }',
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

  test('names the dependents with the base it diffed against', () => {
    const { skipped } = planPrePush({
      ...repo,
      files: DIFFS.core,
      base: 'upstream/release',
      cacheDir: '/cache'
    })
    assert.ok(
      skipped.some((line) => line.includes('--filter="...[upstream/release]"'))
    )
  })

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

  test('a deleted file still typechecks its package and runs the tests beside it', () => {
    const removed = 'packages/components/src/components/Badge/index.tsx'
    const result = plan([], [removed])
    assert.deepEqual(labelsOf('typecheck', result), ['typecheck components'])
    const [tests] = commandsOf('tests', result)
    assert.ok(tests.includes('src/components/Badge/Badge.test.tsx'))
    for (const command of result.steps.flatMap((step) => step.commands))
      assert.ok(!command.some((arg) => arg.endsWith('Badge/index.tsx')))
    assert.ok(result.skipped.every((line) => !line.includes('Badge/index.tsx')))
  })

  test('a charts change runs the engine-free guard', () => {
    const [tests] = commandsOf(
      'tests',
      plan(['packages/charts/src/LineChart/index.tsx'])
    )
    assert.ok(tests.includes('src/Chart/engine-free.test.ts'))
  })

  for (const file of [
    'skills/motion/SKILL.md',
    'skills/migrate/codemods/link-button.js',
    'eslint/roadie-plugin.js'
  ])
    test(`a change to ${file}, whose tests core runs, runs core's guards`, () => {
      const result = plan([file])
      const [tests] = commandsOf('tests', result)
      assert.ok(tests.includes('src/css/motion-skill-parity.test.ts'))
      assert.ok(
        result.skipped.some((line) =>
          line.includes('pnpm test:gated core --all')
        )
      )
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

  test('builds before it typechecks', () => {
    const kinds = plan([...DIFFS.core, ...DIFFS.docs]).steps.map(
      ({ kind }) => kind
    )
    assert.ok(kinds.indexOf('build') < kinds.indexOf('typecheck'))
  })

  test('a root config change typechecks every workspace', () => {
    assert.equal(
      labelsOf('typecheck', plan(DIFFS.lockfile)).length,
      repo.workspaces.filter(({ scripts }) => scripts.typecheck).length
    )
  })

  test('formats a big diff in commands short enough for cmd.exe', () => {
    const files = Array.from(
      { length: 400 },
      (_, index) => `packages/components/src/components/Badge/file-${index}.ts`
    )
    const commands = commandsOf('format', plan(files))
    for (const command of commands)
      assert.ok(command.join(' ').length < 8191, 'fits Windows cmd')
    assert.deepEqual(
      commands.flatMap((command) =>
        command.filter((arg) => files.includes(arg))
      ),
      files
    )
  })

  describe('browser tests', () => {
    const toolbar = 'packages/components/src/components/Toolbar/index.tsx'
    const browserSteps = (result) =>
      result.steps.filter((step) => step.kind === 'browser')
    const testsOf = (step) =>
      step.commands[0].slice(
        3,
        step.commands[0].findIndex((arg) => arg.startsWith('-'))
      )

    test('runs those beside the change in every engine, one at a time', () => {
      const steps = browserSteps(plan([toolbar]))
      assert.deepEqual(
        steps.map(({ env }) => env.ROADIE_BROWSERS),
        ['chromium', 'firefox', 'webkit']
      )
      for (const step of steps) {
        assert.match(step.label, new RegExp(`in ${step.env.ROADIE_BROWSERS}`))
        assert.match(
          step.rerun,
          new RegExp(`^ROADIE_BROWSERS=${step.env.ROADIE_BROWSERS} `)
        )
        assert.deepEqual(testsOf(step), [
          'src/components/Toolbar/Toolbar.browser.test.tsx',
          'src/components/Toolbar/Toolbar.touch.browser.test.tsx'
        ])
        assert.ok(step.commands[0].includes('browser*'))
        assert.match(step.rerun, /--project 'browser\*'/)
      }
    })

    test('runs a changed browser test on its own', () => {
      const changed = 'packages/charts/src/LineChart/LineChart.browser.test.tsx'
      const steps = browserSteps(plan([changed]))
      assert.equal(steps.length, 3)
      for (const step of steps)
        assert.ok(
          testsOf(step).includes('src/LineChart/LineChart.browser.test.tsx')
        )
    })

    test('runs no engine when no browser test is beside the change', () => {
      assert.deepEqual(browserSteps(plan(DIFFS.component)), [])
      assert.deepEqual(browserSteps(plan(DIFFS.docs)), [])
      assert.deepEqual(browserSteps(plan(DIFFS.lockfile)), [])
    })

    test('asks for no engine install when no browser test runs', () => {
      const { skipped } = planPrePush({
        ...repo,
        files: DIFFS.component,
        engines: ['chromium'],
        cacheDir: '/cache'
      })
      assert.ok(!skipped.some((line) => line.includes('playwright install')))
    })

    test("a core CSS change runs components' CSS suite", () => {
      const steps = browserSteps(plan(['packages/core/src/css/emphasis.css']))
      assert.equal(steps.length, 3)
      for (const step of steps) {
        const tests = testsOf(step)
        assert.ok(tests.includes('src/css/focusRing.browser.test.tsx'))
        assert.ok(tests.every((test) => test.startsWith('src/css/')))
      }
    })

    test("builds what components' CSS suite imports before running it", () => {
      const result = plan([
        'packages/core/src/css/emphasis.css',
        'packages/core/src/utils/cn.ts'
      ])
      const [build] = commandsOf('build', result)
      assert.ok(build?.includes('--filter=@oztix/roadie-components^...'))
      const kinds = result.steps.map(({ kind }) => kind)
      assert.ok(kinds.indexOf('build') < kinds.indexOf('browser'))
    })

    test('runs only the engines installed, and says how to add the rest', () => {
      const result = planPrePush({
        ...repo,
        files: [toolbar],
        engines: ['chromium', 'webkit'],
        cacheDir: '/cache'
      })
      assert.deepEqual(
        browserSteps(result).map(({ env }) => env.ROADIE_BROWSERS),
        ['chromium', 'webkit']
      )
      assert.ok(
        result.skipped.some((line) =>
          line.includes('pnpm exec playwright install firefox')
        )
      )
    })

    test('leaves perf tests to the Perf workflow', () => {
      for (const step of browserSteps(plan([toolbar])))
        assert.ok(testsOf(step).every((test) => !test.includes('.perf.')))
    })

    describe('installedEngines', () => {
      const roots = []
      after(() => {
        for (const root of roots) rmSync(root, { recursive: true, force: true })
      })
      const rootWith = (playwright) => {
        const root = mkdtempSync(join(tmpdir(), 'pre-push-engines-'))
        roots.push(root)
        writeFileSync(join(root, 'package.json'), '{}')
        if (playwright) {
          const dir = join(root, 'node_modules', 'playwright')
          mkdirSync(dir, { recursive: true })
          writeFileSync(join(dir, 'index.js'), playwright)
        }
        return root
      }

      test('keeps Chromium and each engine whose browser is on disk', () => {
        const root = rootWith(`
          const missing = () => '/no/such/browser'
          module.exports = {
            chromium: { executablePath: missing },
            firefox: { executablePath: () => __filename },
            webkit: { executablePath: missing }
          }
        `)
        assert.deepEqual(installedEngines(root), ['chromium', 'firefox'])
      })

      test('assumes every engine when Playwright is missing', () => {
        assert.deepEqual(installedEngines(rootWith(null)), ENGINES)
      })
    })
  })

  test('every step but the build has a time budget', () => {
    for (const files of Object.values(DIFFS))
      for (const step of plan(files).steps)
        if (step.kind === 'build') assert.equal(step.budgetS, null)
        else assert.ok(step.budgetS > 0, `${step.label} has a budget`)
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
    assert.equal(
      isGuardTest(
        'src/a.test.ts',
        () => "import { readFile } from 'node:fs/promises'"
      ),
      true
    )
    assert.equal(isGuardTest('src/a.browser.test.tsx', readsFs), false)
    assert.equal(isGuardTest('src/a.ts', readsFs), false)
  })
})
