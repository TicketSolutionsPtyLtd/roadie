import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import { alongside } from './alongside.ts'

let dir: string
afterEach(() => rmSync(dir, { recursive: true, force: true }))

function scratch() {
  dir = mkdtempSync(path.join(tmpdir(), 'alongside-'))
  return path.join(dir, 'done')
}

const after = (ms: number, script: string) =>
  `node -e "setTimeout(() => { ${script} }, ${ms})"`

describe('alongside', () => {
  it('settles with the result once the command has finished', async () => {
    const marker = scratch()
    const outcome = await alongside(
      after(200, `require('fs').writeFileSync('${marker}', '')`),
      () => 'manifest'
    )
    expect(outcome).toEqual({ result: 'manifest', exitCode: 0 })
    expect(existsSync(marker)).toBe(true)
  })

  it("passes on the command's exit code instead of the result", async () => {
    expect(await alongside(after(50, 'process.exit(3)'), () => 'x')).toEqual({
      exitCode: 3
    })
  })

  it('waits for the command before throwing what the work threw', async () => {
    const marker = scratch()
    await expect(
      alongside(
        after(200, `require('fs').writeFileSync('${marker}', '')`),
        () => {
          throw new Error('no docs page')
        }
      )
    ).rejects.toThrow('no docs page')
    expect(existsSync(marker)).toBe(true)
  })

  it('does the work alone without a command', async () => {
    expect(await alongside(undefined, () => 1)).toEqual({
      result: 1,
      exitCode: 0
    })
  })

  // A shell reports a signalled child as 128 plus the signal, not as a signal.
  it('fails when a signal stops the command', async () => {
    const outcome = await alongside(
      `node -e "process.kill(process.pid, 'SIGTERM')"`,
      () => 'x'
    )
    expect(outcome).not.toHaveProperty('result')
    expect(outcome.exitCode).toBeGreaterThan(0)
  })
})
