#!/usr/bin/env node
// Keeps each CI job's saved Turbo cache to what its recent runs used, since a
// restored cache only grows (PR caches reached 1 GB). Entries a run used are
// stamped in .turbo/cache-access.json; entries unused for MAX_AGE_DAYS go,
// then the least recently used until the cache fits MAX_MB.
import {
  appendFileSync,
  existsSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const DAY_MS = 24 * 60 * 60 * 1000
const ENTRY = /^([0-9a-f]+)(?:\.tar\.zst|-meta\.json|-manifest\.json)$/

export function usedHashes(runsDir) {
  if (!existsSync(runsDir)) return new Set()
  return new Set(
    readdirSync(runsDir)
      .filter((file) => file.endsWith('.json'))
      .flatMap((file) => {
        const summary = JSON.parse(readFileSync(join(runsDir, file), 'utf8'))
        return (summary.tasks ?? []).map((task) => task.hash)
      })
  )
}

function readEntries(cacheDir) {
  const entries = new Map()
  if (!existsSync(cacheDir)) return entries
  for (const file of readdirSync(cacheDir)) {
    const hash = file.match(ENTRY)?.[1]
    if (!hash) continue
    const entry = entries.get(hash) ?? { files: [], bytes: 0 }
    entry.files.push(file)
    entry.bytes += statSync(join(cacheDir, file)).size
    entries.set(hash, entry)
  }
  return entries
}

export function pruneTurboCache({
  cacheDir,
  accessFile,
  runsDir,
  now = Date.now(),
  maxAgeDays = 3,
  maxBytes = 1024 * 1024 * 1024
}) {
  const before = existsSync(accessFile)
    ? JSON.parse(readFileSync(accessFile, 'utf8'))
    : {}
  const entries = readEntries(cacheDir)
  const used = usedHashes(runsDir)

  const access = {}
  for (const hash of entries.keys()) {
    access[hash] = used.has(hash) ? now : (before[hash] ?? now)
  }
  const added = [...entries.keys()].filter((hash) => !(hash in before))

  const oldestFirst = [...entries.keys()].sort((a, b) => access[a] - access[b])
  let total = [...entries.values()].reduce((sum, { bytes }) => sum + bytes, 0)
  const removed = []
  for (const hash of oldestFirst) {
    const stale = now - access[hash] > maxAgeDays * DAY_MS
    if (!stale && total <= maxBytes) break
    for (const file of entries.get(hash).files) {
      rmSync(join(cacheDir, file), { force: true })
    }
    total -= entries.get(hash).bytes
    delete access[hash]
    removed.push(hash)
  }

  writeFileSync(accessFile, `${JSON.stringify(access, null, 2)}\n`)
  return {
    added,
    removed,
    kept: Object.keys(access).length,
    bytes: total,
    changed: added.length > 0 || removed.length > 0
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = pruneTurboCache({
    cacheDir: '.turbo/cache',
    accessFile: '.turbo/cache-access.json',
    runsDir: '.turbo/runs',
    maxBytes: Number(process.env.TURBO_CACHE_MAX_MB || 1024) * 1024 * 1024
  })
  console.log(
    `Turbo cache: ${result.kept} entries, ${(result.bytes / 1024 / 1024).toFixed(0)} MB. ` +
      `${result.added.length} new, ${result.removed.length} pruned.`
  )
  const line = `changed=${result.changed}\n`
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, line)
  else process.stdout.write(line)
}
