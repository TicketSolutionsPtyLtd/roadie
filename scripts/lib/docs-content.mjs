import { execFileSync } from 'node:child_process'

import { repoRoot } from './machine.mjs'

export const EM_DASH_FILES = [
  ':(glob)*.md',
  ':(glob)docs/src/**/*.mdx',
  ':(glob)docs/src/**/*.tsx',
  ':(glob)docs/contributing/*.md',
  ':(glob)docs/solutions/**/*.md',
  ':(glob).changeset/*.md',
  ':(glob).github/**/*.md',
  ':(glob)skills/**/*.md',
  ':(glob)packages/*/*.md',
  ':(glob)packages/*/src/**/*.md',
  // Changesets writes the changelogs from changesets, which this covers.
  ':(exclude,glob)**/CHANGELOG.md'
]

export const IMAGE_FILES = [
  ':(glob)docs/src/**/*.mdx',
  ':(glob)docs/src/**/*.tsx',
  ':(glob)docs/src/**/*.ts',
  ':(exclude,glob)docs/src/**/*.test.*'
]

export const IMAGE_HOSTS = ['assets.oztix.com.au']

const EM_DASH = '—'

export function emDashFindings(file, source) {
  return source.split('\n').flatMap((line, index) =>
    line.includes(EM_DASH)
      ? [
          {
            file,
            line: index + 1,
            message: 'Em dash. Use a colon, comma, full stop, or brackets.'
          }
        ]
      : []
  )
}

// `src`, `srcSet`, and `poster` as JSX or HTML attributes or object keys,
// and markdown's `![alt](url)`.
const IMAGE_SOURCE =
  /\b(?:src|srcSet|poster)\s*[=:]\s*\{?\s*(['"`])(.+?)\1|!\[[^\]]*\]\(\s*<?([^\s)>]+)/g

// The docs' own site serves docs/public, for an example that needs an
// absolute URL, such as an email's image.
const DOCS_SITE = 'https://ticketsolutionsptyltd.github.io/roadie/'

export function externalImageHost(url) {
  if (!/^(?:https?:)?\/\//i.test(url)) return null
  if (url.startsWith(DOCS_SITE)) return null
  const hostname = URL.parse(url, 'https://localhost')?.hostname || url
  return IMAGE_HOSTS.includes(hostname) ? null : hostname
}

export function externalImageFindings(file, source) {
  return source.split('\n').flatMap((line, index) =>
    [...line.matchAll(IMAGE_SOURCE)].flatMap(([, , attribute, markdown]) => {
      // A srcSet lists several URLs, each with a width.
      const host = (attribute ?? markdown)
        .split(',')
        .map((candidate) => externalImageHost(candidate.trim().split(/\s+/)[0]))
        .find(Boolean)
      return host
        ? [
            {
              file,
              line: index + 1,
              message: `Image from ${host}. Use a docs/public path or ${IMAGE_HOSTS.join(', ')}.`
            }
          ]
        : []
    })
  )
}

export function trackedFiles(pathspecs) {
  return execFileSync('git', ['ls-files', '-z', '--', ...pathspecs], {
    cwd: repoRoot,
    encoding: 'utf8'
  })
    .split('\0')
    .filter(Boolean)
}
