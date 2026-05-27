import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// Scans the package source (excluding tests) for hardcoded hosts / key-shaped
// literals. Makes the design's "nothing secret/environment-specific lives in
// the package" rule a structurally enforced guarantee, not a documented
// promise. The host + fetch are always injected by the consuming app, so no
// absolute http(s):// host should ever appear in shipped source.
//
// The patterns below are deliberately broad (URL-safe base64, JWT triples,
// provider key prefixes). The POSITIVE fixtures lock that breadth in: weakening
// any pattern makes a fixture fail, so the guard can't silently rot into a
// pattern that passes against clean source while catching nothing real.

const SRC = join(__dirname, '..')

const BANNED: Array<{ name: string; re: RegExp }> = [
  { name: 'absolute http(s) host', re: /https?:\/\/[a-z0-9.-]+/i },
  {
    // base64 / base64url run in a string literal (standard + url-safe alphabet)
    name: 'long key-shaped literal',
    re: /['"`][A-Za-z0-9+/_-]{40,}={0,2}['"`]/
  },
  {
    // JWT: three base64url segments, header starts `eyJ`
    name: 'jwt',
    re: /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/
  },
  {
    // Known provider key prefixes — these shapes never occur in normal code.
    name: 'provider key prefix',
    re: /\b(?:(?:sk|pk)_(?:live|test)_[A-Za-z0-9]{8,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{16})\b/
  },
  {
    // Named secret in a string literal: api_key / secret / token / password
    // followed by a separator and a long value. Quoted-only so identifiers
    // like `tokenRefreshHandler` don't trip it.
    name: 'named secret literal',
    re: /['"`](?:api[_-]?key|secret|token|password|passwd|pwd)[_\-=:][^'"`\s]{12,}['"`]/i
  }
]

// RFC 6761 reserved sentinel TLDs are not real hosts — allow them (e.g. the
// `https://x.invalid` base used purely as a URL-parser origin reference), but
// ONLY as the host's final label. Checking the whole match let a `.test` in a
// path/query whitelist a real malicious host (`https://evil.com/x.test"`).
const SENTINEL_TLD = /\.(?:invalid|test|example|localhost)$/i

function hostOf(matchedHttpHost: string): string {
  return (
    matchedHttpHost.replace(/^https?:\/\//i, '').split(/[/:?#'"`]/)[0] ?? ''
  )
}

function findOffenders(text: string): string[] {
  const out: string[] = []
  for (const { name, re } of BANNED) {
    const match = text.match(re)
    if (!match) continue
    if (
      name === 'absolute http(s) host' &&
      SENTINEL_TLD.test(hostOf(match[0]))
    ) {
      continue
    }
    out.push(`[${name}] ${match[0]}`)
  }
  return out
}

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
      for (const hit of findOffenders(readFileSync(file, 'utf8'))) {
        offenders.push(`${file}: ${hit}`)
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([])
  })

  // Positive detection — every pattern must actually catch its target shape.
  // The secret-shaped samples are assembled from fragments at runtime so no
  // contiguous token literal sits in this file — otherwise external secret
  // scanners flag the test fixtures themselves (they match the whole token,
  // not split concatenations). The guard sees the joined runtime value.
  const jwtSample = [
    'eyJhbGciOiJIUzI1NiJ9',
    'eyJzdWIiOiJ0In0',
    'notarealsig'
  ].join('.')
  const POSITIVE: Array<{ name: string; sample: string }> = [
    {
      name: 'absolute http(s) host',
      sample: `fetch('https://api.oztix.com.au/cart')`
    },
    {
      name: 'long key-shaped literal',
      sample: `const k = '${'A'.repeat(48)}'`
    },
    {
      name: 'long key-shaped literal',
      sample: `const k = '${'aB3-_x'.repeat(8)}'` // url-safe base64
    },
    { name: 'jwt', sample: `const t = ${jwtSample}` },
    {
      name: 'provider key prefix',
      sample: `const k = ${'sk_' + 'live_' + 'ABCDEFGHIJ1234567890'}`
    },
    {
      name: 'provider key prefix',
      sample: `const k = ${'ghp_' + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'}`
    },
    {
      name: 'provider key prefix',
      sample: `const k = ${'xoxb-' + '1234567890-abcdEFGHijkl'}`
    },
    {
      name: 'provider key prefix',
      sample: `const k = ${'AKIA' + 'IOSFODNN7EXAMPLE'}`
    },
    {
      name: 'named secret literal',
      sample: `const k = 'api_key=${'sk-' + 'abcdefghijklmnop'}'`
    }
  ]

  it.each(POSITIVE)('detects $name in: $sample', ({ name, sample }) => {
    expect(findOffenders(sample)).toContainEqual(
      expect.stringContaining(`[${name}]`)
    )
  })

  it('allows sentinel TLDs only as the final host label', () => {
    // Reserved sentinels as the real host → allowed.
    expect(findOffenders(`base('https://x.invalid')`)).toEqual([])
    expect(findOffenders(`host('https://h.example')`)).toEqual([])
    // A sentinel buried in the path must NOT whitelist a real host.
    expect(
      findOffenders(`fetch('https://evil.com/redirect?to=x.test')`)
    ).toContainEqual(expect.stringContaining('[absolute http(s) host]'))
  })
})
