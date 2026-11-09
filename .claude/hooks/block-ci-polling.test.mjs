import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const hook = fileURLToPath(new URL('./block-ci-polling.mjs', import.meta.url))

function runHook(toolInput, timeout) {
  return spawnSync(process.execPath, [hook], {
    input: JSON.stringify({ tool_name: 'Bash', tool_input: toolInput }),
    encoding: 'utf8',
    timeout
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
    'sleep "60"',
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
    "zsh -l -c 'sleep 60'",
    'while true; do gh pr checks 1 && break; sleep $DELAY; done',
    'while sleep $DELAY; do gh pr checks 1 && break; done',
    'until gh pr checks 1; do /bin/sleep 5; done',
    'gh pr checks 1 \\\n  --watch --fail-fast',
    'gh run \\\n  watch 123',
    'sleep \\\n  60',
    'sleep infinity',
    'sleep $((60))',
    'sleep $((5 * 60))',
    'sleep "${DELAY:-60}"',
    'sleep ${DELAY:=2m}',
    'watch -n 30 gh pr checks 1',
    'watch gh run list',
    'while gh run view 1 | grep -q in_progress; do :; done',
    'until gh pr checks 1; do :; done',
    'perl -e "sleep 60"',
    "python3 -c 'import time; time.sleep(60)'",
    "node -e 'setTimeout(() => {}, 60000)'"
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
    'for f in a b; do touch $f; done; sleep 2; echo done',
    'for f in a; do echo $f; done; sleep 2; for g in b; do echo $g; done',
    'echo waiting for build; sleep 2; ls; echo done',
    'for f in $(grep -rl sleep src); do wc -l $f; done',
    'do-build; sleep 2; done-check',
    'node scripts/wait-for-load.mjs',
    'gh pr checks 1 -w',
    'sleep $((2 * 3))',
    'sleep "${DELAY:-5}"',
    'echo "${NAME:-there}"; sleep 2',
    'pnpm --filter docs run watch',
    'while read -r n; do gh pr view "$n"; done < prs.txt',
    'for n in 1 2; do gh pr view $n; done',
    'perl -e "sleep 2"',
    'python3 -c "print(1)"',
    "node -e 'setTimeout(() => {}, 500)'",
    'git commit -m "Block watch -n 30 and perl sleeps"',
    `git commit -m "Deny inline sleeps\n\nperl -e 'sleep 60' now fails"`,
    `git commit -m "Fix\nnode -e 'setTimeout(() => {}, 60000)'"`
  ]) {
    it(`allows ${JSON.stringify(command)}`, () => {
      assert.equal(runHook({ command }).status, 0)
    })
  }

  it('allows a CI watch run in the background', () => {
    const command = 'gh pr checks 1 --watch --fail-fast'
    assert.equal(runHook({ command, run_in_background: true }).status, 0)
  })

  it('decides a long line of repeated gh pr checks in seconds', () => {
    const command = 'gh pr checks 1 '.repeat(2000)
    assert.equal(runHook({ command }, 5000).status, 0)
  })

  it('allows input it cannot parse', () => {
    const result = spawnSync(process.execPath, [hook], {
      input: 'not json',
      encoding: 'utf8'
    })
    assert.equal(result.status, 0)
  })
})
