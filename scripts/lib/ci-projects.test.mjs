import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, test } from 'node:test'

import {
  CI_SCRIPTS,
  ciProjects,
  gatedArgs,
  gatedProjects,
  projectsIn
} from './ci-projects.mjs'
import { repoRoot } from './machine.mjs'

const scriptsOf = (path) =>
  JSON.parse(readFileSync(join(repoRoot, path, 'package.json'), 'utf8')).scripts

const components = scriptsOf('packages/components')

describe('test:gated stays in step with CI', () => {
  test('reads the scripts the CI workflow runs tests with', () => {
    const workflow = readFileSync(
      join(repoRoot, '.github/workflows/ci.yml'),
      'utf8'
    )
    // One turbo call can run several tasks, as in `turbo lint typecheck`.
    const ciTestTasks = new Set(
      [...workflow.matchAll(/pnpm turbo (?:run )?([\w: ]+)/g)].flatMap(
        ([, tasks]) => tasks.split(' ').filter((task) => /^test\b/.test(task))
      )
    )
    assert.deepEqual([...ciTestTasks].sort(), [...CI_SCRIPTS].sort())
  })

  test('runs the components projects CI runs, without perf', () => {
    for (const files of [['src/components/Checkbox/index.tsx'], []]) {
      const { projectArgs, env } = gatedProjects({
        scripts: components,
        files,
        perf: false,
        vitestArgs: []
      })
      assert.deepEqual(projectArgs, [
        '--project',
        'jsdom',
        '--project',
        'browser*'
      ])
      assert.deepEqual(env, {})
    }
  })

  test('runs perf with its script env on --perf or perf files alone', () => {
    const perfRun = {
      projectArgs: ['--project', 'perf'],
      env: { NODE_ENV: 'production' }
    }
    const base = { scripts: components, vitestArgs: [] }
    assert.deepEqual(gatedProjects({ ...base, files: [], perf: true }), perfRun)
    assert.deepEqual(
      gatedProjects({
        ...base,
        files: ['src/components/RecordTable/RecordTable.perf.browser.test.tsx'],
        perf: false
      }),
      perfRun
    )
  })

  test('leaves the projects to a caller who names them', () => {
    const { projectArgs } = gatedProjects({
      scripts: components,
      files: [],
      perf: false,
      vitestArgs: ['--project', 'perf']
    })
    assert.deepEqual(projectArgs, [])
  })

  test('filters no project where a CI script runs them all', () => {
    assert.deepEqual(ciProjects(scriptsOf('packages/core')), [])
    assert.deepEqual(
      ciProjects({
        test: 'vitest run --project node',
        'test:browser': 'vitest run'
      }),
      []
    )
  })

  test('reads quoted and bare project names', () => {
    assert.deepEqual(
      projectsIn(
        `vitest run --project 'browser (*)' --project="a b" --project=jsdom`
      ),
      ['browser (*)', 'a b', 'jsdom']
    )
  })
})

describe('test:gated arguments', () => {
  const browsersOf = (args, env = {}) => gatedArgs(args, env).browsers

  test('run Chromium unless asked otherwise', () => {
    assert.equal(browsersOf([]), 'chromium')
  })

  test('read ROADIE_BROWSERS as the browser config does', () => {
    assert.equal(browsersOf([], { ROADIE_BROWSERS: 'webkit' }), 'webkit')
    assert.equal(
      browsersOf([], { ROADIE_BROWSERS: 'chromium, webkit,' }),
      'chromium,webkit'
    )
  })

  test('take the last --browsers over ROADIE_BROWSERS', () => {
    assert.equal(
      browsersOf(['--browsers=webkit', '--browsers=firefox'], {
        ROADIE_BROWSERS: 'chromium'
      }),
      'firefox'
    )
  })

  test('run every engine with --all-browsers', () => {
    assert.equal(
      browsersOf(['--all-browsers', '--browsers=firefox']),
      'chromium,webkit,firefox'
    )
  })

  test('reject an engine Playwright has no project for', () => {
    assert.equal(browsersOf(['--browsers=safari']), null)
    assert.equal(browsersOf(['--browsers=firefox,safari']), null)
    assert.equal(browsersOf(['--browsers=']), null)
  })

  test('read files up to the first flag that is not its own', () => {
    assert.deepEqual(
      gatedArgs(
        [
          '--browsers=webkit',
          'src/a.tsx',
          '--all',
          'src/b.tsx',
          '--perf',
          '--all-browsers',
          '-t',
          'Escape',
          '--project',
          'browser*'
        ],
        {}
      ),
      {
        all: true,
        perf: true,
        browsers: 'chromium,webkit,firefox',
        fileArgs: ['src/a.tsx', 'src/b.tsx'],
        vitestArgs: ['-t', 'Escape', '--project', 'browser*']
      }
    )
  })
})
