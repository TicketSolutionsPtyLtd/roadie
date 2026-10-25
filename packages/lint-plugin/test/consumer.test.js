import { ESLint as ESLint10 } from 'eslint'
import { ESLint as ESLint9 } from 'eslint-v9'
import { execFileSync } from 'node:child_process'
import { existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  BROWSER_TEST_MISTAKE_RULES,
  FIXED,
  MISTAKE_RULES,
  TEST_MISTAKE_RULES,
  addRoadie,
  createApp
} from './app.js'

const CONFIG = `import roadie from '@oztix/roadie-lint-plugin'

export default [roadie.configs.recommended, ...roadie.configs.testing]
`

let app
let packed
beforeAll(() => {
  ;({ app, packed } = createApp('roadie-eslint-consumer-', {
    'eslint.config.js': CONFIG
  }))
  // The plugin has no dependencies, so the install never needs the network.
  const install = ['install', '--offline', '--legacy-peer-deps', '--no-audit']
  execFileSync('npm', [...install, packed.filename], {
    cwd: app,
    stdio: 'ignore'
  })
  addRoadie(app)
}, 60_000)

afterAll(() => rmSync(app, { recursive: true, force: true }))

describe.each([
  ['ESLint 9', ESLint9],
  ['ESLint 10', ESLint10]
])('an app on %s with the recommended and testing configs', (_, ESLint) => {
  const lint = async (file) => {
    const [result] = await new ESLint({ cwd: app }).lintFiles([file])
    return result.messages.map(({ ruleId }) => ruleId).sort()
  }

  it('reports each kind of Roadie mistake', async () => {
    expect(await lint('src/Mistakes.jsx')).toEqual(MISTAKE_RULES)
  })

  it('passes code that follows Roadie', async () => {
    expect(await lint('src/Clean.jsx')).toEqual([])
  })

  it('reports each testing mistake in a test', async () => {
    expect(await lint('src/Ticket.test.jsx')).toEqual(TEST_MISTAKE_RULES)
  })

  it('allows only the jsdom ones in a browser test', async () => {
    expect(await lint('src/Ticket.browser.test.jsx')).toEqual(
      BROWSER_TEST_MISTAKE_RULES
    )
  })

  it('fixes a class to its canonical form', async () => {
    const [result] = await new ESLint({ cwd: app, fix: true }).lintFiles([
      'src/Fixable.jsx'
    ])
    expect(result.output).toBe(FIXED)
  })
})

// eslint --cache keys on the plugin's name and version to drop stale results.
it('names the installed version, so a cached lint reruns after an upgrade', async () => {
  const entry = join(app, 'node_modules/@oztix/roadie-lint-plugin/src/index.js')
  const { default: installed } = await import(pathToFileURL(entry).href)
  expect(installed.meta).toEqual({ name: packed.name, version: packed.version })
})

// The repo's own rules import ./internal through the workspace link.
it('leaves the repo-only factories out of the published package', () => {
  const installed = join(app, 'node_modules/@oztix/roadie-lint-plugin')
  expect(existsSync(join(installed, 'src/index.js'))).toBe(true)
  expect(existsSync(join(installed, 'src/internal.js'))).toBe(false)
})
