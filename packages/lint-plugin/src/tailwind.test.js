import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
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

// pnpm points NODE_PATH at the workspace store, where Roadie resolves, so
// these run in a process without it.
function canonicalIn(file) {
  const output = execFileSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `import { canonicalClasses } from ${JSON.stringify(new URL('./tailwind.js', import.meta.url).href)}
console.log(String(canonicalClasses(${JSON.stringify(file)}, ['p-[16px]'])))`
    ],
    { env: { ...process.env, NODE_PATH: '' }, encoding: 'utf8' }
  )
  return output.trim()
}

const tempApp = () => mkdtempSync(join(tmpdir(), 'canonical-'))

it('skips a file with no Roadie installed', () => {
  expect(canonicalIn(join(tempApp(), 'Fixture.tsx'))).toBe('undefined')
})

it('skips a file when Tailwind predates canonical classes', () => {
  const app = tempApp()
  const files = {
    'node_modules/@oztix/roadie-core/package.json': JSON.stringify({
      name: '@oztix/roadie-core',
      exports: { './css': './roadie.css' }
    }),
    'node_modules/@oztix/roadie-core/roadie.css': "@import 'tailwindcss';",
    'node_modules/tailwindcss/package.json': JSON.stringify({
      name: 'tailwindcss',
      main: 'index.js'
    }),
    // 4.1.14's design system, which has no canonicalizeCandidates.
    'node_modules/tailwindcss/index.js':
      'exports.__unstable__loadDesignSystem = async () => ({})'
  }
  for (const [file, content] of Object.entries(files)) {
    mkdirSync(dirname(join(app, file)), { recursive: true })
    writeFileSync(join(app, file), content)
  }
  expect(canonicalIn(join(app, 'Fixture.tsx'))).toBe('undefined')
})
