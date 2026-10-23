import { ESLint as ESLint9 } from 'eslint'
import { ESLint as ESLint10 } from 'eslint-v10'
import { execFileSync } from 'node:child_process'
import { rmSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { MISTAKE_RULES, createApp } from './app.js'

const CONFIG = `import roadie from '@oztix/roadie-lint-plugin'

export default [roadie.configs.recommended]
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
}, 60_000)

afterAll(() => rmSync(app, { recursive: true, force: true }))

describe.each([
  ['ESLint 9', ESLint9],
  ['ESLint 10', ESLint10]
])('an app on %s with the recommended config', (_, ESLint) => {
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
})

// eslint --cache keys on the plugin's name and version to drop stale results.
it('names the installed version, so a cached lint reruns after an upgrade', async () => {
  const entry = join(app, 'node_modules/@oztix/roadie-lint-plugin/src/index.js')
  const { default: installed } = await import(pathToFileURL(entry).href)
  expect(installed.meta).toEqual({ name: packed.name, version: packed.version })
})
