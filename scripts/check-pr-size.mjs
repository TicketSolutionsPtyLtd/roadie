#!/usr/bin/env node
// Warns when a branch changes more lines than one review sitting can cover.
// Usage: node scripts/check-pr-size.mjs [--base origin/main] [--strict]
import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'

export const THRESHOLD = 400

export const EXCLUDED = [
  /(^|\/)pnpm-lock\.yaml$/,
  /(^|\/)__snapshots__\//,
  /\.snap$/,
  /^packages\/core\/src\/css\/dataviz\.css$/,
  /^\.changeset\/[^/]+\.md$/,
  /(^|\/)CHANGELOG\.md$/
]

export const isExcluded = (path) =>
  EXCLUDED.some((pattern) => pattern.test(path))

// numstat writes renames as `old => new` or `dir/{old => new}/file`.
const destinationPath = (path) =>
  path
    .replace(/\{[^{}]* => ([^{}]*)\}/g, '$1')
    .replace(/^.* => /, '')
    .replace(/\/\//g, '/')

export function countChangedLines(numstat) {
  const files = numstat
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [added, deleted, ...rest] = line.split('\t')
      const path = destinationPath(rest.join('\t'))
      // Binary files report `-` for both counts.
      const lines = (Number(added) || 0) + (Number(deleted) || 0)
      return { path, lines, excluded: isExcluded(path) }
    })
  const counted = files.filter((file) => !file.excluded)
  return {
    total: counted.reduce((sum, file) => sum + file.lines, 0),
    excludedLines: files
      .filter((file) => file.excluded)
      .reduce((sum, file) => sum + file.lines, 0),
    files: counted.length
  }
}

export function formatReport(
  { total, excludedLines, files },
  base,
  threshold = THRESHOLD
) {
  const summary = `${total} changed lines in ${files} files against ${base} (${excludedLines} generated or lock lines not counted; threshold ${threshold}).`
  if (total <= threshold)
    return { oversized: false, message: `PR size OK: ${summary}` }
  return {
    oversized: true,
    message: `PR size warning: ${summary} Consider splitting it into smaller PRs that each leave main working (docs/contributing/PR_WORKFLOW.md, section 1).`
  }
}

function parseArgs(argv) {
  const baseIndex = argv.indexOf('--base')
  return {
    base: baseIndex === -1 ? 'origin/main' : argv[baseIndex + 1],
    strict: argv.includes('--strict')
  }
}

function main() {
  const { base, strict } = parseArgs(process.argv.slice(2))
  const numstat = execFileSync('git', ['diff', '--numstat', `${base}...HEAD`], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024
  })
  const { oversized, message } = formatReport(countChangedLines(numstat), base)
  if (!oversized) {
    console.log(message)
    return
  }
  console.warn(message)
  if (strict) process.exitCode = 1
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main()
