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

function increment(version, bump) {
  const [major, minor, patch] = version.split('.').map(Number)
  if (bump === 'major') return `${major + 1}.0.0`
  if (bump === 'minor') return `${major}.${minor + 1}.0`
  return `${major}.${minor}.${patch + 1}`
}

// The shim depends on ^pluginVersion, which a 0.x minor leaves, as a major does.
function leavesRange(pluginVersion, pluginBump) {
  return pluginVersion.startsWith('0.')
    ? pluginBump === 'minor' || pluginBump === 'major'
    : pluginBump === 'major'
}

/** The version the shim releases at, as Changesets would assemble it. */
export function nextShimVersion({
  shimVersion,
  shimBump,
  pluginVersion,
  pluginBump
}) {
  if (shimBump) return increment(shimVersion, shimBump)
  if (leavesRange(pluginVersion, pluginBump)) {
    return increment(shimVersion, 'patch')
  }
  return shimVersion
}
