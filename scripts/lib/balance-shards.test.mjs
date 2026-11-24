import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

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
    // Hash order sliced by count could put a, b and c on one shard.
    const input = files({ a: 30, b: 28, c: 24, d: 3, e: 3, f: 3, g: 3, h: 3 })
    const dealt = shards(input, 3)
    for (const heavy of ['a', 'b', 'c']) {
      assert.equal(dealt.filter((shard) => shard.includes(heavy)).length, 1)
    }
    assert.deepEqual(
      dealt.map((shard) => shard.filter((key) => 'abc'.includes(key)).length),
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
