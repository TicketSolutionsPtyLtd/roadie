import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const hook = fileURLToPath(new URL('./block-ci-polling.mjs', import.meta.url))

function runHook(toolInput) {
  return spawnSync(process.execPath, [hook], {
    input: JSON.stringify({ tool_name: 'Bash', tool_input: toolInput }),
    encoding: 'utf8'
  })
}

describe('block-ci-polling', () => {
  for (const command of [
    'sleep 60; gh pr checks 1',
    'sleep 11',
    'sleep 1m && gh run list',
    'sleep 0.5m',
    'sleep 5 6',
    'gh run watch 123',
    'gh run watch',
    'gh pr checks 1 --watch --interval 60 --fail-fast',
    'gh pr checks --watch 1',
    'timeout 600 gh pr checks 1 --watch',
    'until gh pr checks 1; do sleep 5; done',
    'while true; do gh run list; sleep 2; done',
    'for i in 1 2 3; do gh pr checks 1; sleep 30; done',
    'cd /repo && sleep 120',
    'git push\nsleep 300'
  ]) {
    it(`denies ${JSON.stringify(command)}`, () => {
      const { status, stderr } = runHook({ command })
      assert.equal(status, 2)
      assert.match(stderr, /End your turn/)
      assert.match(stderr, /run_in_background/)
    })
  }

  for (const command of [
    'sleep 2',
    'sleep 10',
    'sleep 10s',
    'sleep $DELAY',
    'gh pr checks 1',
    'gh run view 123 --log-failed',
    'pnpm test:gated core',
    'git commit -m "Block gh run watch and sleep 60 polling"',
    "echo 'until x; do sleep 60; done'",
    "gh pr create --draft --body-file - <<'EOF'\nBlocks `gh pr checks --watch` and `sleep 60`.\nEOF",
    'while read -r f; do echo "$f"; done < files.txt',
    'node scripts/wait-for-load.mjs'
  ]) {
    it(`allows ${JSON.stringify(command)}`, () => {
      assert.equal(runHook({ command }).status, 0)
    })
  }

  it('allows a CI watch run in the background', () => {
    const command = 'gh pr checks 1 --watch --fail-fast'
    assert.equal(runHook({ command, run_in_background: true }).status, 0)
  })

  it('allows input it cannot parse', () => {
    const result = spawnSync(process.execPath, [hook], {
      input: 'not json',
      encoding: 'utf8'
    })
    assert.equal(result.status, 0)
  })
})
