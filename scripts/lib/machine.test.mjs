import assert from 'node:assert/strict'
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
