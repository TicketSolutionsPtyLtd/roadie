import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, expect, it } from 'vitest'

const WARNING =
  '@oztix/roadie-eslint-plugin is now @oztix/roadie-lint-plugin. Swap the package in package.json and the import in your lint config.\n'

const pack = (dir, app) =>
  JSON.parse(
    execFileSync('pnpm', ['pack', '--pack-destination', app, '--json'], {
      cwd: fileURLToPath(new URL(dir, import.meta.url)),
      encoding: 'utf8'
    })
  ).filename

const LOAD_TWICE = `
const shim = await import('@oztix/roadie-eslint-plugin')
await import('@oztix/roadie-eslint-plugin')
const plugin = await import('@oztix/roadie-lint-plugin')
console.log(JSON.stringify({
  sameRules: shim.default.rules === plugin.default.rules,
  samePlugin: shim.default === plugin.default
}))
`

// Packs both packages as npm would publish them into a fresh app. The new name
// isn't on npm yet, so an override points the shim's range at the same
// tarball the app installs.
let app
beforeAll(() => {
  app = mkdtempSync(join(tmpdir(), 'roadie-eslint-plugin-shim-'))
  const shim = pack('..', app)
  const plugin = pack('../../lint-plugin', app)
  writeFileSync(
    join(app, 'package.json'),
    JSON.stringify({ name: 'consumer', private: true, type: 'module' })
  )
  writeFileSync(
    join(app, 'pnpm-workspace.yaml'),
    `overrides:\n  '@oztix/roadie-lint-plugin': 'file:${plugin}'\n`
  )
  writeFileSync(join(app, 'load.mjs'), LOAD_TWICE)
  execFileSync('pnpm', ['add', '--offline', shim, plugin], {
    cwd: app,
    stdio: 'pipe'
  })
}, 60_000)

afterAll(() => rmSync(app, { recursive: true, force: true }))

const load = (NODE_ENV) => {
  const env = { ...process.env, NODE_ENV }
  if (NODE_ENV === undefined) delete env.NODE_ENV
  const { stdout, stderr } = spawnSync('node', ['load.mjs'], {
    cwd: app,
    env,
    encoding: 'utf8'
  })
  return { result: JSON.parse(stdout), stderr }
}

it('publishes a dependency range on the version the new name is at', () => {
  const { version } = JSON.parse(
    readFileSync(new URL('../../lint-plugin/package.json', import.meta.url))
  )
  const installed = JSON.parse(
    readFileSync(
      join(app, 'node_modules/@oztix/roadie-eslint-plugin/package.json'),
      'utf8'
    )
  )
  expect(installed.dependencies).toEqual({
    '@oztix/roadie-lint-plugin': `^${version}`
  })
})

it('re-exports the new plugin, rules and all', () => {
  expect(load(undefined).result).toEqual({ sameRules: true, samePlugin: true })
})

it('warns once when it loads', () => {
  expect(load(undefined).stderr).toBe(WARNING)
  expect(load('development').stderr).toBe(WARNING)
})

it('stays quiet in production', () => {
  expect(load('production').stderr).toBe('')
})
