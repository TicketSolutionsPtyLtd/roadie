import { execFileSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, it } from 'vitest'

import { canonicalClasses } from './tailwind.js'

it("reads Roadie's theme, so a length becomes the tier that matches it", () => {
  const file = fileURLToPath(
    new URL('../../core/src/Fixture.tsx', import.meta.url)
  )
  expect(
    canonicalClasses(file, [
      'rounded-[8px]',
      'p-4',
      'emphasis-subtle',
      'p-[16px]'
    ])
  ).toEqual(['rounded-lg', 'p-4', 'emphasis-subtle', 'p-4'])
})

it('skips a file with no Roadie installed', () => {
  const file = join(mkdtempSync(join(tmpdir(), 'no-roadie-')), 'Fixture.tsx')
  // pnpm points NODE_PATH at the workspace store, where Roadie resolves.
  const env = { ...process.env, NODE_PATH: '' }
  const output = execFileSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `import { canonicalClasses } from ${JSON.stringify(new URL('./tailwind.js', import.meta.url).href)}
console.log(String(canonicalClasses(${JSON.stringify(file)}, ['p-[16px]'])))`
    ],
    { env, encoding: 'utf8' }
  )
  expect(output.trim()).toBe('undefined')
})
