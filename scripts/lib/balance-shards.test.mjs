import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, test } from 'node:test'

import { sizeBalanced } from '../../vitest.browsers.config.ts'
import { balanceShards } from './balance-shards.mjs'

const files = (weights) =>
  Object.entries(weights).map(([key, weight]) => ({ item: key, key, weight }))

const shards = (input, count) =>
  Array.from({ length: count }, (_, i) => balanceShards(input, i + 1, count))

describe('balanceShards', () => {
  test('gives every file to exactly one shard', () => {
    const input = files({ a: 9, b: 7, c: 5, d: 5, e: 3, f: 2, g: 1 })
    const dealt = shards(input, 3).flat().sort()
    assert.deepEqual(dealt, ['a', 'b', 'c', 'd', 'e', 'f', 'g'])
  })

  test('splits by weight, not by count', () => {
    // Hash order sliced by count could put x, y and z on one shard. The heavy
    // files sort last by key, so dealing in key order unbalances the totals.
    const input = files({ a: 3, b: 3, c: 3, d: 3, e: 3, x: 30, y: 28, z: 24 })
    const dealt = shards(input, 3)
    for (const heavy of ['x', 'y', 'z']) {
      assert.equal(dealt.filter((shard) => shard.includes(heavy)).length, 1)
    }
    assert.deepEqual(
      dealt.map((shard) => shard.filter((key) => 'xyz'.includes(key)).length),
      [1, 1, 1]
    )
    const totals = dealt.map((shard) =>
      shard.reduce(
        (sum, key) => sum + input.find((f) => f.key === key).weight,
        0
      )
    )
    assert.deepEqual(totals, [33, 31, 33])
  })

  test('deals the same hand whatever order the files arrive in', () => {
    const input = files({ a: 4, b: 4, c: 4, d: 2, e: 2 })
    assert.deepEqual(shards([...input].reverse(), 2), shards(input, 2))
  })
})

describe('sizeBalanced', () => {
  class Base {
    constructor(ctx) {
      this.ctx = ctx
    }
  }

  const withFiles = async (sizes, run) => {
    const root = mkdtempSync(join(tmpdir(), 'size-balanced-'))
    try {
      const specs = Object.entries(sizes).map(([name, size]) => {
        const moduleId = join(root, name)
        writeFileSync(moduleId, 'x'.repeat(size))
        return { project: { name: 'browser (firefox)' }, moduleId }
      })
      return await run(root, specs)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  }

  const shardOf = async (root, specs, shard) => {
    const Sequencer = sizeBalanced(Base)
    const dealt = await new Sequencer({ config: { root, shard } }).shard(specs)
    return dealt.map(({ moduleId }) => moduleId.slice(root.length + 1))
  }

  test('weighs each file by its size on disk', () =>
    withFiles(
      { a: 300, b: 300, c: 300, d: 300, e: 1000 },
      async (root, specs) => {
        assert.deepEqual(await shardOf(root, specs, { index: 1, count: 2 }), [
          'e'
        ])
        assert.deepEqual(await shardOf(root, specs, { index: 2, count: 2 }), [
          'a',
          'b',
          'c',
          'd'
        ])
      }
    ))

  test('leaves the files alone without --shard', () =>
    withFiles({ a: 1, b: 2 }, async (root, specs) => {
      assert.deepEqual(await shardOf(root, specs, undefined), ['a', 'b'])
    }))
})
