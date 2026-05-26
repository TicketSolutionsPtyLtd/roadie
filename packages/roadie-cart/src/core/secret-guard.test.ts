import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

// Scans the package source (excluding tests) for hardcoded hosts / key-shaped
// literals. Makes the design's "nothing secret/environment-specific lives in
// the package" rule a structurally enforced guarantee, not a documented
// promise. The host + fetch are always injected by the consuming app, so no
// absolute http(s):// host should ever appear in shipped source.

const SRC = join(__dirname, '..')

// RFC 6761 reserved sentinel TLDs are not real hosts — allow them (e.g. the
// `https://x.invalid` base used purely as a URL-parser origin reference).
const ALLOWED_HOST = /\.(invalid|test|example|localhost)(\/|$|["'`])/i

const BANNED: Array<{ name: string; re: RegExp }> = [
  { name: 'absolute http(s) host', re: /https?:\/\/[a-z0-9.-]+/i },
  { name: 'long key-shaped literal', re: /['"`][A-Za-z0-9+/]{40,}={0,2}['"`]/ },
  {
    name: 'named secret literal',
    re: /(sk|pk|api[_-]?key|secret|token)[_-][A-Za-z0-9]{16,}/i
  }
]

function sourceFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...sourceFiles(full))
      continue
    }
    if (!/\.(ts|tsx|vue)$/.test(entry.name)) continue
    if (/\.test\.(ts|tsx)$/.test(entry.name)) continue // tests may use sample hosts
    out.push(full)
  }
  return out
}

describe('secret-guard: no hardcoded hosts or keys in cart source', () => {
  it('source files contain no banned patterns', () => {
    const offenders: string[] = []
    for (const file of sourceFiles(SRC)) {
      const text = readFileSync(file, 'utf8')
      for (const { name, re } of BANNED) {
        const match = text.match(re)
        if (!match) continue
        if (name === 'absolute http(s) host' && ALLOWED_HOST.test(match[0])) {
          continue
        }
        offenders.push(`${file}: [${name}] ${match[0]}`)
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([])
  })
})
