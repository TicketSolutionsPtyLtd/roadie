/**
 * Deals files to shards heaviest first, each onto the lightest shard so far,
 * and returns shard `index` (1-based) of `count`. Ties break on `key`, so
 * every runner deals the same hand. `vitest.browsers.config.ts` shards the
 * browser tests with it.
 *
 * @template T
 * @param {{ item: T, key: string, weight: number }[]} files
 * @param {number} index
 * @param {number} count
 * @returns {T[]}
 */
export function balanceShards(files, index, count) {
  const totals = Array.from({ length: count }, () => 0)
  /** @type {T[]} */
  const mine = []
  const heaviestFirst = [...files].sort(
    (a, b) =>
      b.weight - a.weight || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0)
  )
  for (const file of heaviestFirst) {
    const lightest = totals.indexOf(Math.min(...totals))
    totals[lightest] += file.weight
    if (lightest === index - 1) mine.push(file.item)
  }
  return mine
}
