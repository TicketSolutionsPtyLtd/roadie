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
    'sleep 10; gh pr checks 1; sleep 10',
    'gh run watch 123',
    'gh run watch',
    'gh pr checks 1 --watch --interval 60 --fail-fast',
    'gh pr checks --watch 1',
    'timeout 600 gh pr checks 1 --watch',
    'until gh pr checks 1; do sleep 5; done',
    'while true; do gh run list; sleep 2; done',
    'for i in 1 2 3; do gh pr checks 1; sleep 30; done',
    'for i in $(seq 60); do gh pr checks 1 && break; sleep 10; done',
    'while sleep 30; do gh pr checks 1 && break; done',
    'while true; do for n in 1 2; do gh pr checks $n; done; sleep 5; done',
    'while true\ndo\n  gh pr checks 1 && break\n  sleep 5\ndone',
    'cd /repo && sleep 120',
    'git push\nsleep 300',
    'sleep 1h',
    'timeout 120 sleep 60',
    '/bin/sleep 60',
    'if gh pr checks 1; then :; else sleep 60; fi',
    'sleep 60 > /dev/null',
    'sleep 60 # wait for CI',
    '(sleep 60) && gh pr checks 1',
    "timeout 900 bash -c 'until gh pr checks 1; do sleep 5; done'",
    "bash -lc 'gh run watch 123'",
    'sh -c "sleep 600"',
    "zsh -l -c 'sleep 60'"
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
    'grep -rn sleep src',
    "bash -c 'pnpm test && sleep 2'",
    'gh pr checks 1',
    'gh run view 123 --log-failed',
    'pnpm test:gated core',
    'git commit -m "Block gh run watch and sleep 60 polling"',
    "echo 'until x; do sleep 60; done'",
    "gh pr create --draft --body-file - <<'EOF'\nBlocks `gh pr checks --watch` and `sleep 60`.\nEOF",
    'while read -r f; do echo "$f"; done < files.txt',
    'for f in *.png; do optipng "$f"; done; sleep 2',
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
