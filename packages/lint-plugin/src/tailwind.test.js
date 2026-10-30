import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, it, vi } from 'vitest'

import { canonicalClasses } from './tailwind.js'

const file = fileURLToPath(
  new URL('../../core/src/Fixture.tsx', import.meta.url)
)

it("reads Roadie's theme, so a length becomes the tier that matches it", () => {
  expect(
    canonicalClasses(file, [
      'rounded-[8px]',
      'p-4',
      'emphasis-subtle',
      'p-[16px]'
    ])
  ).toEqual(['rounded-lg', 'p-4', 'emphasis-subtle', 'p-4'])
})

it('answers the request after a timed-out one from a fresh worker', async () => {
  // A fresh module starts its own worker, which can't load Tailwind in 1ms.
  vi.resetModules()
  const { ask } = await import('./tailwind.js')
  const request = (classes) => ({
    stylesheet: createRequire(file).resolve('@oztix/roadie-core/css'),
    app: dirname(file),
    classes
  })
  expect(ask(request(['p-[16px]']), 1)).toBeNull()
  expect(ask(request(['p-[8px]']))).toEqual(['p-2'])
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

const ROADIE = {
  'node_modules/@oztix/roadie-core/package.json': JSON.stringify({
    name: '@oztix/roadie-core',
    exports: { './css': './roadie.css' }
  }),
  'node_modules/@oztix/roadie-core/roadie.css': "@import 'tailwindcss';"
}

function appWith(files) {
  const app = tempApp()
  for (const [file, content] of Object.entries({ ...ROADIE, ...files })) {
    mkdirSync(dirname(join(app, file)), { recursive: true })
    writeFileSync(join(app, file), content)
  }
  return app
}

it('skips a file when Tailwind predates canonical classes', () => {
  const app = appWith({
    'node_modules/tailwindcss/package.json': JSON.stringify({
      name: 'tailwindcss',
      main: 'index.js'
    }),
    // 4.1.14's design system, which has no canonicalizeCandidates.
    'node_modules/tailwindcss/index.js':
      'exports.__unstable__loadDesignSystem = async () => ({})'
  })
  expect(canonicalIn(join(app, 'Fixture.tsx'))).toBe('undefined')
})

// tailwindcss is an optional peer, and roadie-core doesn't depend on it.
it('skips a file when the app has Roadie but no Tailwind', () => {
  expect(canonicalIn(join(appWith({}), 'Fixture.tsx'))).toBe('undefined')
})
