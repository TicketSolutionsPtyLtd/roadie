import { ESLint as ESLint9 } from 'eslint'
import { ESLint as ESLint10 } from 'eslint-v10'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const packageDir = fileURLToPath(new URL('..', import.meta.url))

const CONFIG = `import roadie from '@oztix/roadie-eslint-plugin'

export default [roadie.configs.recommended]
`

const MISTAKES = `import { Heart, StarIcon } from '@phosphor-icons/react'

export const Ticket = () => (
  <div className='dark:bg-strong z-[5] rounded-[10px] bg-[#ff0000]'>
    <Heart weight='bold' className='size-4' />
    <StarIcon size={16} />
  </div>
)
`

const CLEAN = `import { HeartIcon } from '@phosphor-icons/react'

export const Ticket = () => <HeartIcon weight='bold' className='size-4 rounded-xl z-popover' />
`

// Packs the package as npm would publish it and installs the tarball into a
// fresh app, so only the published files and exports can be reached.
let app
let packed
beforeAll(() => {
  app = mkdtempSync(join(tmpdir(), 'roadie-eslint-consumer-'))
  const output = execFileSync(
    'pnpm',
    ['pack', '--pack-destination', app, '--json'],
    { cwd: packageDir, encoding: 'utf8' }
  )
  packed = JSON.parse(output)
  writeFileSync(
    join(app, 'package.json'),
    JSON.stringify({ name: 'consumer', private: true, type: 'module' })
  )
  // The plugin has no dependencies, so the install never needs the network.
  const install = ['install', '--offline', '--legacy-peer-deps', '--no-audit']
  execFileSync('npm', [...install, packed.filename], {
    cwd: app,
    stdio: 'ignore'
  })
  writeFileSync(join(app, 'eslint.config.js'), CONFIG)
  mkdirSync(join(app, 'src'))
  writeFileSync(join(app, 'src/Mistakes.jsx'), MISTAKES)
  writeFileSync(join(app, 'src/Clean.jsx'), CLEAN)
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
    expect(await lint('src/Mistakes.jsx')).toEqual([
      'roadie/no-arbitrary-radius',
      'roadie/no-arbitrary-z-index',
      'roadie/no-dark-variant',
      'roadie/no-hex-colour-class',
      'roadie/phosphor-icon-size-prop',
      'roadie/phosphor-icon-suffix',
      'roadie/phosphor-icon-weight'
    ])
  })

  it('passes code that follows Roadie', async () => {
    expect(await lint('src/Clean.jsx')).toEqual([])
  })
})

// eslint --cache keys on the plugin's name and version to drop stale results.
it('names the installed version, so a cached lint reruns after an upgrade', async () => {
  const entry = join(
    app,
    'node_modules/@oztix/roadie-eslint-plugin/src/index.js'
  )
  const { default: installed } = await import(pathToFileURL(entry).href)
  expect(installed.meta).toEqual({ name: packed.name, version: packed.version })
})
