import { execFileSync, spawnSync } from 'node:child_process'
import { readFileSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  BROWSER_TEST_MISTAKE_RULES,
  MISTAKE_RULES,
  TEST_MISTAKE_RULES,
  createApp
} from './app.js'

const { devDependencies } = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8')
)

const CONFIGS = {
  '.oxlintrc.json': JSON.stringify({
    extends: [
      './node_modules/@oztix/roadie-lint-plugin/oxlint/recommended.json',
      './node_modules/@oztix/roadie-lint-plugin/oxlint/testing.json'
    ]
  }),
  'oxlint.config.ts': `import { defineConfig } from 'oxlint'

import recommended from '@oztix/roadie-lint-plugin/oxlint/recommended.json' with { type: 'json' }
import testing from '@oztix/roadie-lint-plugin/oxlint/testing.json' with { type: 'json' }

export default defineConfig({ extends: [recommended, testing] })
`
}

// An app with oxlint and no ESLint. oxlint comes from the store the
// workspace install already filled. A frozen install fetches no registry
// metadata, so on a fresh CI store pnpm may still need the network for it.
let app
let installOutput
beforeAll(() => {
  let packed
  ;({ app, packed } = createApp('roadie-oxlint-consumer-', CONFIGS))
  installOutput = execFileSync(
    'pnpm',
    [
      'add',
      '-D',
      '--prefer-offline',
      packed.filename,
      `oxlint@${devDependencies.oxlint}`
    ],
    { cwd: app, encoding: 'utf8', stdio: 'pipe' }
  )
}, 60_000)

afterAll(() => rmSync(app, { recursive: true, force: true }))

describe.each(Object.keys(CONFIGS))(
  'an app on oxlint with the presets in %s',
  (config) => {
    const lint = (file) => {
      // oxlint exits 1 when it reports an error, so read the report either way.
      const { stdout } = spawnSync(
        join(app, 'node_modules/.bin/oxlint'),
        ['-c', config, '-f', 'json', file],
        { cwd: app, encoding: 'utf8' }
      )
      // oxlint writes rule IDs as roadie(rule), and ESLint as roadie/rule.
      return JSON.parse(stdout)
        .diagnostics.map(({ code }) => code.replace(/^(\w+)\((.+)\)$/, '$1/$2'))
        .sort()
    }

    it('reports each kind of Roadie mistake, with the same rule IDs as ESLint', () => {
      expect(lint('src/Mistakes.jsx')).toEqual(MISTAKE_RULES)
    })

    it('passes code that follows Roadie', () => {
      expect(lint('src/Clean.jsx')).toEqual([])
    })

    it('reports each testing mistake in a test', () => {
      expect(lint('src/Ticket.test.jsx')).toEqual(TEST_MISTAKE_RULES)
    })

    it('allows only the jsdom ones in a browser test', () => {
      expect(lint('src/Ticket.browser.test.jsx')).toEqual(
        BROWSER_TEST_MISTAKE_RULES
      )
    })
  }
)

it('installs beside oxlint alone, with no peer warning and no ESLint', () => {
  expect(installOutput).not.toMatch(/peer/i)
  // pnpm installs a required peer itself, so ESLint would show up here.
  const store = readdirSync(join(app, 'node_modules/.pnpm'))
  expect(store.filter((dir) => dir.startsWith('eslint@'))).toEqual([])
})
