// Release rule for the Claude Code plugin, for scripts/check-plugin-release.mjs.
import { execFileSync } from 'node:child_process'

export const MANIFEST = '.claude-plugin/plugin.json'
export const CHANGELOG = 'skills/CHANGELOG.md'

const touchesPlugin = (path) => path.startsWith('skills/') && path !== CHANGELOG

const parts = (version) => version.split('.').map(Number)

function isNewer(head, base) {
  const [h, b] = [parts(head), parts(base)]
  for (let i = 0; i < Math.max(h.length, b.length); i++) {
    const diff = (h[i] ?? 0) - (b[i] ?? 0)
    if (diff !== 0) return diff > 0
  }
  return false
}

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const hasHeading = (changelog, version) =>
  new RegExp(`^## ${escapeRegExp(version)}(\\s|$)`, 'm').test(changelog)

export function checkPluginRelease({
  changedFiles,
  baseVersion,
  headVersion,
  changelog
}) {
  if (!changedFiles.some(touchesPlugin))
    return { ok: true, message: 'Plugin release OK: no changes under skills/.' }

  // Installs only update when the version string changes, so an unbumped skill
  // edit never reaches anyone.
  if (baseVersion !== null && !isNewer(headVersion, baseVersion))
    return {
      ok: false,
      message: `Plugin release: skills/ changed but ${MANIFEST} is still ${headVersion} (base ${baseVersion}). Bump its version and add a "## <version>" entry to ${CHANGELOG}.`
    }

  if (!hasHeading(changelog, headVersion))
    return {
      ok: false,
      message: `Plugin release: ${CHANGELOG} has no "## ${headVersion}" entry for the new version.`
    }

  return {
    ok: true,
    message: `Plugin release OK: ${baseVersion ?? 'none'} to ${headVersion}.`
  }
}

const git = (...args) =>
  execFileSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  })

export const readChangedFiles = (base) =>
  git('diff', '--name-only', '--no-renames', `${base}...HEAD`)
    .split('\n')
    .filter(Boolean)

export function readVersion(ref) {
  try {
    return JSON.parse(git('show', `${ref}:${MANIFEST}`)).version ?? null
  } catch {
    return null
  }
}
