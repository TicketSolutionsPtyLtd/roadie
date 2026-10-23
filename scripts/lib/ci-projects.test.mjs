import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, test } from 'node:test'

import {
  CI_SCRIPTS,
  ciProjects,
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
    const ciTestTasks = new Set(
      [...workflow.matchAll(/pnpm turbo (?:run )?(test[\w:]*)/g)].map(
        ([, task]) => task
      )
    )
    assert.deepEqual([...ciTestTasks].sort(), [...CI_SCRIPTS].sort())
  })

  test('runs the components projects CI runs, without perf', () => {
    const { projectArgs, env } = gatedProjects({
      scripts: components,
      files: ['src/components/Checkbox/index.tsx'],
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
