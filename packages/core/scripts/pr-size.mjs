// Counts a branch's changed lines for scripts/check-pr-size.mjs.
import { execFileSync } from 'node:child_process'

export const THRESHOLD = 400

export const EXCLUDED = [
  /(^|\/)pnpm-lock\.yaml$/,
  /^skills-lock\.json$/,
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
  const summary = `${total} changed lines in ${files} files against ${base} (${excludedLines} excluded lines not counted; threshold ${threshold}).`
  if (total <= threshold)
    return { oversized: false, message: `PR size OK: ${summary}` }
  return {
    oversized: true,
    message: `PR size warning: ${summary} Consider splitting it into smaller PRs that each leave main working (docs/contributing/PR_WORKFLOW.md, section 1).`
  }
}

export function parseArgs(argv) {
  const baseIndex = argv.indexOf('--base')
  return {
    base: (baseIndex !== -1 && argv[baseIndex + 1]) || 'origin/main',
    strict: argv.includes('--strict')
  }
}

// A missing base or a shallow clone must not block a push, so it skips in one line.
export function readNumstat(base) {
  try {
    return execFileSync('git', ['diff', '--numstat', `${base}...HEAD`], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe']
    })
  } catch (error) {
    const reason = String(error.stderr || error.message)
      .trim()
      .split('\n')[0]
    console.warn(`PR size check skipped, no diff against ${base}: ${reason}`)
    return null
  }
}
