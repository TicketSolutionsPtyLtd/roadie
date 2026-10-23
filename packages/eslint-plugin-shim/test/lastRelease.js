const BUMPS = ['patch', 'minor', 'major']
const ENTRY = /^\s*['"]?([^'":\s]+)['"]?\s*:\s*(patch|minor|major)\s*$/

/** The highest bump each package gets from a set of changeset files. */
export function pendingBumps(changesets) {
  const bumps = {}
  for (const text of changesets) {
    const [, frontmatter = ''] = text.match(/^---\n([\s\S]*?)\n---/) ?? []
    for (const line of frontmatter.split('\n')) {
      const [, name, bump] = line.match(ENTRY) ?? []
      if (name && BUMPS.indexOf(bump) > BUMPS.indexOf(bumps[name])) {
        bumps[name] = bump
      }
    }
  }
  return bumps
}

// The shim depends on ^pluginVersion, which a 0.x minor leaves, as a major does.
export function rereleasesShim({ pluginVersion, pluginBump, shimBump }) {
  if (shimBump) return false
  const leavesRange = pluginVersion.startsWith('0.')
    ? pluginBump === 'minor' || pluginBump === 'major'
    : pluginBump === 'major'
  return leavesRange
}
