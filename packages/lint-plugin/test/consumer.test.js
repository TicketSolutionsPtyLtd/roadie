import { ESLint as ESLint9 } from 'eslint'
import { ESLint as ESLint10 } from 'eslint-v10'
import { execFileSync, spawnSync } from 'node:child_process'
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const packageDir = fileURLToPath(new URL('..', import.meta.url))

const { devDependencies } = JSON.parse(
  readFileSync(join(packageDir, 'package.json'), 'utf8')
)

const ESLINT_CONFIG = `import roadie from '@oztix/roadie-lint-plugin'

export default [roadie.configs.recommended]
`

const OXLINT_JSON_CONFIG = JSON.stringify({
  extends: ['./node_modules/@oztix/roadie-lint-plugin/oxlint/recommended.json']
})

const OXLINT_TS_CONFIG = `import { defineConfig } from 'oxlint'

import recommended from '@oztix/roadie-lint-plugin/oxlint/recommended.json' with { type: 'json' }

export default defineConfig({ extends: [recommended] })
`

const MISTAKES = `import { Heart, StarIcon } from '@phosphor-icons/react'
import { Card } from '@oztix/roadie-components/card'

export const Ticket = () => (
  <div className='dark:bg-strong z-[5] rounded-[10px] bg-[#ff0000]'>
    <Heart weight='bold' className='size-4' />
    <StarIcon size={16} />
    <Card><Card.Header>Midnight Frequency</Card.Header></Card>
  </div>
)
`

const CLEAN = `import { HeartIcon } from '@phosphor-icons/react'
import { Card } from '@oztix/roadie-components/card'

export const Ticket = () => (
  <Card>
    <Card.Content>
      <HeartIcon weight='bold' className='size-4 rounded-xl z-popover' />
    </Card.Content>
  </Card>
)
`

const MISTAKE_RULES = [
  'roadie/card-content',
  'roadie/no-arbitrary-radius',
  'roadie/no-arbitrary-z-index',
  'roadie/no-dark-variant',
  'roadie/no-hex-colour-class',
  'roadie/phosphor-icon-size-prop',
  'roadie/phosphor-icon-suffix',
  'roadie/phosphor-icon-weight'
]

function createApp(root, name, files) {
  const app = join(root, name)
  mkdirSync(join(app, 'src'), { recursive: true })
  writeFileSync(
    join(app, 'package.json'),
    JSON.stringify({ name, private: true, type: 'module' })
  )
  writeFileSync(join(app, 'src/Mistakes.jsx'), MISTAKES)
  writeFileSync(join(app, 'src/Clean.jsx'), CLEAN)
  for (const [file, content] of Object.entries(files))
    writeFileSync(join(app, file), content)
  return app
}

// Packs the package as npm would publish it and installs the tarball into
// fresh apps, so only the published files and exports can be reached.
let root
let packed
let eslintApp
let oxlintApp
let oxlintInstallOutput
beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'roadie-lint-consumer-'))
  const output = execFileSync(
    'pnpm',
    ['pack', '--pack-destination', root, '--json'],
    { cwd: packageDir, encoding: 'utf8' }
  )
  packed = JSON.parse(output)

  eslintApp = createApp(root, 'eslint-app', {
    'eslint.config.js': ESLINT_CONFIG
  })
  // The plugin has no dependencies, so the install never needs the network.
  const install = ['install', '--offline', '--legacy-peer-deps', '--no-audit']
  execFileSync('npm', [...install, packed.filename], {
    cwd: eslintApp,
    stdio: 'ignore'
  })

  // An app with oxlint and no ESLint. oxlint comes from the store the
  // workspace install already filled.
  oxlintApp = createApp(root, 'oxlint-app', {
    '.oxlintrc.json': OXLINT_JSON_CONFIG,
    'oxlint.config.ts': OXLINT_TS_CONFIG
  })
  oxlintInstallOutput = execFileSync(
    'pnpm',
    [
      'add',
      '--save-dev',
      '--offline',
      packed.filename,
      `oxlint@${devDependencies.oxlint}`
    ],
    { cwd: oxlintApp, encoding: 'utf8', stdio: 'pipe' }
  )
}, 120_000)

afterAll(() => rmSync(root, { recursive: true, force: true }))

describe.each([
  ['ESLint 9', ESLint9],
  ['ESLint 10', ESLint10]
])('an app on %s with the recommended config', (_, ESLint) => {
  const lint = async (file) => {
    const [result] = await new ESLint({ cwd: eslintApp }).lintFiles([file])
    return result.messages.map(({ ruleId }) => ruleId).sort()
  }

  it('reports each kind of Roadie mistake', async () => {
    expect(await lint('src/Mistakes.jsx')).toEqual(MISTAKE_RULES)
  })

  it('passes code that follows Roadie', async () => {
    expect(await lint('src/Clean.jsx')).toEqual([])
  })
})

describe.each([
  ['.oxlintrc.json', 'extends the preset by path'],
  ['oxlint.config.ts', 'imports the preset']
])('an app on oxlint whose %s %s', (config) => {
  const lint = (file) => {
    // oxlint exits 1 when it reports an error, so read the report either way.
    const { stdout } = spawnSync(
      join(oxlintApp, 'node_modules/.bin/oxlint'),
      ['-c', config, '-f', 'json', file],
      { cwd: oxlintApp, encoding: 'utf8' }
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
})

it('installs beside oxlint alone, with no peer warning and no ESLint', () => {
  expect(oxlintInstallOutput).not.toMatch(/peer/i)
  // pnpm installs a required peer itself, so ESLint would show up here.
  const store = readdirSync(join(oxlintApp, 'node_modules/.pnpm'))
  expect(store.filter((dir) => dir.startsWith('eslint@'))).toEqual([])
})

// eslint --cache keys on the plugin's name and version to drop stale results.
it('names the installed version, so a cached lint reruns after an upgrade', async () => {
  const entry = join(
    eslintApp,
    'node_modules/@oztix/roadie-lint-plugin/src/index.js'
  )
  const { default: installed } = await import(pathToFileURL(entry).href)
  expect(installed.meta).toEqual({ name: packed.name, version: packed.version })
})
