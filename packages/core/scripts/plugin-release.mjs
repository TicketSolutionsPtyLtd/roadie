// Release rules for the Claude Code plugin, for scripts/check-plugin-release.mjs
// and scripts/sync-plugin-version.mjs.
import { execFileSync } from 'node:child_process'

export const PACKAGE_NAME = 'roadie-skills'
export const PACKAGE = 'skills/package.json'
export const MANIFEST = 'skills/.claude-plugin/plugin.json'

// Changesets owns these, so the Version Packages PR passes without a changeset.
const RELEASE_FILES = new Set([PACKAGE, MANIFEST, 'skills/CHANGELOG.md'])

const touchesPlugin = (path) =>
  path.startsWith('skills/') && !RELEASE_FILES.has(path)

const isChangeset = (path) =>
  /^\.changeset\/[^/]+\.md$/.test(path) && path !== '.changeset/README.md'

const unquote = (text) => text.trim().replace(/^['"]|['"]$/g, '')

// A `none` bump names the package but never releases it.
export function namesPackage(changeset, name = PACKAGE_NAME) {
  const frontmatter = changeset.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!frontmatter) return false
  return frontmatter[1].split(/\r?\n/).some((line) => {
    const [key, bump = ''] = line.split(':')
    return unquote(key) === name && unquote(bump) !== 'none'
  })
}

export function checkPluginRelease({
  changedFiles,
  readChangeset,
  basePackageVersion,
  packageVersion,
  manifestVersion
}) {
  if (packageVersion !== manifestVersion)
    return {
      ok: false,
      message: `Plugin release: ${MANIFEST} is ${manifestVersion} but ${PACKAGE} is ${packageVersion}. Run node scripts/sync-plugin-version.mjs.`
    }

  if (!changedFiles.some(touchesPlugin))
    return { ok: true, message: 'Plugin release OK: no changes under skills/.' }

  // The PR that creates the package releases its own first version.
  if (basePackageVersion === null)
    return {
      ok: true,
      message: `Plugin release OK: first release, ${packageVersion}.`
    }

  const changesets = changedFiles.filter(isChangeset)
  if (changesets.some((path) => namesPackage(readChangeset(path))))
    return {
      ok: true,
      message: `Plugin release OK: a changeset names ${PACKAGE_NAME}.`
    }

  return {
    ok: false,
    message: `Plugin release: skills/ changed without a changeset for ${PACKAGE_NAME}. Run pnpm changeset and pick ${PACKAGE_NAME} (patch for wording and fixes, minor for a new skill or a change in what one does).`
  }
}

// Rewrites only the version, so the manifest's formatting survives.
export function syncManifest(manifest, version) {
  const pattern = /("version"\s*:\s*)"[^"]*"/
  if (!pattern.test(manifest)) throw new Error(`${MANIFEST} has no version`)
  return manifest.replace(pattern, `$1"${version}"`)
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

export function readVersionAt(ref, path) {
  try {
    return JSON.parse(git('show', `${ref}:${path}`)).version ?? null
  } catch {
    return null
  }
}
