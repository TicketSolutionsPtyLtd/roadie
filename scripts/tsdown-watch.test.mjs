import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, it } from 'node:test'

import { cacheTransforms, skipUnchangedWrites } from './tsdown-watch.mjs'

describe('cacheTransforms', () => {
  function countingPlugin() {
    const calls = []
    const plugin = {
      name: 'compiler',
      transform: {
        filter: undefined,
        handler(code, id) {
          calls.push(id)
          return { code: `compiled ${code}` }
        }
      }
    }
    return { plugin, calls }
  }

  it('reuses the result until the code changes', async () => {
    const { plugin, calls } = countingPlugin()
    const { handler } = (await cacheTransforms(plugin)).transform
    assert.deepEqual(await handler('a', 'x.tsx'), { code: 'compiled a' })
    assert.deepEqual(await handler('a', 'x.tsx'), { code: 'compiled a' })
    assert.deepEqual(await handler('b', 'x.tsx'), { code: 'compiled b' })
    assert.deepEqual(await handler('a', 'y.tsx'), { code: 'compiled a' })
    assert.deepEqual(calls, ['x.tsx', 'x.tsx', 'y.tsx'])
  })

  it('leaves a plugin whose hook is a plain function as it is', async () => {
    const transform = (code) => ({ code })
    const plugin = { name: 'plain', transform }
    assert.equal((await cacheTransforms(plugin)).transform, transform)
  })

  it('keeps a filter the plugin sets on its hook later', async () => {
    const { plugin } = countingPlugin()
    const cached = await cacheTransforms(Promise.resolve(plugin))
    plugin.transform.filter = { code: /use client/ }
    assert.deepEqual(cached.transform.filter, { code: /use client/ })
  })
})

describe('skipUnchangedWrites', () => {
  let dir
  afterEach(() => rmSync(dir, { recursive: true, force: true }))

  function rebuild(plugin, files) {
    const bundle = Object.fromEntries(
      Object.entries(files).map(([fileName, code]) => [
        fileName,
        { type: 'chunk', code, map: null }
      ])
    )
    plugin.generateBundle({ dir }, bundle)
    for (const [fileName, output] of Object.entries(bundle))
      writeFileSync(path.join(dir, fileName), output.code)
    return Object.keys(bundle)
  }

  it('writes only the outputs a rebuild changed', () => {
    dir = mkdtempSync(path.join(tmpdir(), 'skip-writes-'))
    const plugin = skipUnchangedWrites()
    assert.deepEqual(rebuild(plugin, { 'a.js': '1', 'b.js': '1' }), [
      'a.js',
      'b.js'
    ])
    assert.deepEqual(rebuild(plugin, { 'a.js': '2', 'b.js': '1' }), ['a.js'])
  })

  it('writes an unchanged output again once it is gone from disk', () => {
    dir = mkdtempSync(path.join(tmpdir(), 'skip-writes-'))
    const plugin = skipUnchangedWrites()
    rebuild(plugin, { 'a.js': '1' })
    rmSync(path.join(dir, 'a.js'))
    assert.deepEqual(rebuild(plugin, { 'a.js': '1' }), ['a.js'])
  })
})
