import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { describe, test } from 'node:test'

import { shimCommand } from './machine.mjs'

const args = ['exec', 'vitest', '--project', 'browser (*)', 'src/a b.ts']

describe('shimCommand', () => {
  test('runs pnpm straight on macOS and Linux', () => {
    const straight = { command: 'pnpm', args, shell: false }
    assert.deepEqual(shimCommand('pnpm', args, 'darwin'), straight)
    assert.deepEqual(shimCommand('pnpm', args, 'linux'), straight)
  })

  test('runs pnpm through cmd on Windows, quoting what cmd would split', () => {
    assert.deepEqual(
      shimCommand('pnpm', [...args, 'say "hi"', '--filter=docs^...'], 'win32'),
      {
        command:
          'pnpm exec vitest --project "browser (*)" "src/a b.ts" "say \\"hi\\"" "--filter=docs^..."',
        args: [],
        shell: true
      }
    )
  })
})

// A limit below zero keeps the load over it, on Windows too, where it reads 0.
function waitOverLimit(options) {
  const script = `
    const { waitForLoad } = await import(${JSON.stringify(import.meta.resolve('./machine.mjs'))})
    const started = Date.now()
    const error = await waitForLoad(${JSON.stringify(options)}).catch((e) => e)
    console.log(JSON.stringify({ ms: Date.now() - started, gaveUp: error instanceof Error }))
  `
  const { stdout } = spawnSync(
    process.execPath,
    ['--input-type=module', '-e', script],
    {
      env: { ...process.env, ROADIE_LOAD_LIMIT: '-1' },
      encoding: 'utf8',
      timeout: 20_000
    }
  )
  return JSON.parse(stdout.trim().split('\n').at(-1))
}

describe('waitForLoad', () => {
  test('gives up at its limit, without sleeping out the last poll', () => {
    const { ms, gaveUp } = waitOverLimit({ maxWaitMs: 300, pollMs: 6_000 })
    assert.equal(gaveUp, true)
    assert.ok(ms >= 300 && ms < 5_000, `gave up after ${ms}ms`)
  })
})
