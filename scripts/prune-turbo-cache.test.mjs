import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, it } from 'node:test'

import { pruneTurboCache } from './prune-turbo-cache.mjs'

const DAY = 24 * 60 * 60 * 1000
const NOW = 100 * DAY

function fixture({ entries, access, used = [] }) {
  const root = mkdtempSync(join(tmpdir(), 'prune-turbo-'))
  const cacheDir = join(root, 'cache')
  const runsDir = join(root, 'runs')
  mkdirSync(cacheDir)
  mkdirSync(runsDir)
  for (const [hash, bytes] of Object.entries(entries)) {
    writeFileSync(join(cacheDir, `${hash}.tar.zst`), Buffer.alloc(bytes))
    writeFileSync(join(cacheDir, `${hash}-meta.json`), '')
  }
  const accessFile = join(root, 'cache-access.json')
  if (access) writeFileSync(accessFile, JSON.stringify(access))
  writeFileSync(
    join(runsDir, 'run.json'),
    JSON.stringify({ tasks: used.map((hash) => ({ hash })) })
  )
  const hashes = () =>
    [...new Set(readdirSync(cacheDir).map((f) => f.slice(0, 4)))].sort()
  return { cacheDir, runsDir, accessFile, hashes }
}

describe('pruneTurboCache', () => {
  it('drops entries no run has used within the age limit', () => {
    const f = fixture({
      entries: { aaaa: 10, bbbb: 10, cccc: 10 },
      access: { aaaa: NOW - 5 * DAY, bbbb: NOW - 1 * DAY, cccc: NOW - 9 * DAY },
      used: ['cccc']
    })
    const result = pruneTurboCache({ ...f, now: NOW, maxAgeDays: 3 })
    assert.deepEqual(f.hashes(), ['bbbb', 'cccc'])
    assert.deepEqual(result.removed, ['aaaa'])
    assert.equal(result.changed, true)
  })

  it('drops the least recently used entries until the cache fits', () => {
    const f = fixture({
      entries: { aaaa: 400, bbbb: 400, cccc: 400 },
      access: { aaaa: NOW - 2 * DAY, bbbb: NOW - 1 * DAY, cccc: NOW },
      used: ['cccc']
    })
    pruneTurboCache({ ...f, now: NOW, maxBytes: 900 })
    assert.deepEqual(f.hashes(), ['bbbb', 'cccc'])
  })

  it('reports no change when a run only replayed what it restored', () => {
    const f = fixture({
      entries: { aaaa: 10 },
      access: { aaaa: NOW - DAY },
      used: ['aaaa']
    })
    const result = pruneTurboCache({ ...f, now: NOW })
    assert.equal(result.changed, false)
  })

  it('reports no change for a job that restored nothing and ran no turbo task', () => {
    const turbo = join(mkdtempSync(join(tmpdir(), 'prune-turbo-')), '.turbo')
    const result = pruneTurboCache({
      cacheDir: join(turbo, 'cache'),
      accessFile: join(turbo, 'cache-access.json'),
      runsDir: join(turbo, 'runs'),
      now: NOW
    })
    assert.equal(result.changed, false)
  })

  it('counts entries a run wrote as a change', () => {
    const f = fixture({
      entries: { aaaa: 10, bbbb: 10 },
      access: { aaaa: NOW }
    })
    const result = pruneTurboCache({ ...f, now: NOW })
    assert.deepEqual(result.added, ['bbbb'])
    assert.equal(result.changed, true)
  })

  it('counts refreshing a day-old stamp as a change, so a replay-only run still saves it', () => {
    const f = fixture({
      entries: { aaaa: 10 },
      access: { aaaa: NOW - 2 * DAY },
      used: ['aaaa']
    })
    const result = pruneTurboCache({ ...f, now: NOW })
    assert.equal(result.changed, true)
  })

  it('evicts the largest entry first when every entry was used and the cache is over budget', () => {
    const f = fixture({
      entries: { aaaa: 100, bbbb: 900, cccc: 100 },
      access: { aaaa: NOW, bbbb: NOW, cccc: NOW },
      used: ['aaaa', 'bbbb', 'cccc']
    })
    pruneTurboCache({ ...f, now: NOW, maxBytes: 500 })
    assert.deepEqual(f.hashes(), ['aaaa', 'cccc'])
  })

  it('evicts by last use before size', () => {
    const f = fixture({
      entries: { aaaa: 100, bbbb: 900 },
      access: { aaaa: NOW - DAY, bbbb: NOW },
      used: ['bbbb']
    })
    pruneTurboCache({ ...f, now: NOW, maxBytes: 950 })
    assert.deepEqual(f.hashes(), ['bbbb'])
  })
})
