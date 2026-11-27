import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { dtsLeaks } from './check-dts.mjs'

function dist(files: Record<string, string>) {
  const dir = mkdtempSync(path.join(tmpdir(), 'check-dts-'))
  for (const [file, text] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(dir, file)), { recursive: true })
    writeFileSync(path.join(dir, file), text)
  }
  return dir
}

describe('dtsLeaks', () => {
  it('names each declaration that infers props from a component', () => {
    const dir = dist({
      'Badge/index.d.ts': 'type P = ComponentProps<typeof Badge>',
      'Badge/index.js': 'ComponentProps<typeof Badge>',
      'Card/index.d.ts': 'export type CardProps = { a: string }'
    })
    expect(dtsLeaks(dir)).toEqual(['Badge/index.d.ts'])
  })

  it('finds nothing to check before a build', () => {
    expect(dtsLeaks(path.join(tmpdir(), 'no-such-dist'))).toEqual([])
  })
})
