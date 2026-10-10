// Finds exported components with no docs page or index tile, for
// scripts/check-component-docs.mjs.

/** The kebab-case slug a component folder's docs page and index tile use. */
export function componentSlug(folder) {
  return folder
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase()
}

/** Component folders named by a package.json `exports` block, captured by `pattern`. */
export function exportedFolders(
  exports,
  pattern = /^\.\/dist\/components\/(\w+)\//
) {
  return Object.values(exports)
    .map(
      (value) =>
        (typeof value === 'string' ? value : value?.import)?.match(pattern)?.[1]
    )
    .filter(Boolean)
}

/** Slugs a preview file draws, one per `case '<slug>':` that isn't commented out. */
export function caseSlugs(source) {
  const withoutBlockComments = source.replace(/\/\*[\s\S]*?\*\//g, '')
  return [...withoutBlockComments.matchAll(/^\s*case '([\w-]+)':/gm)].map(
    ([, slug]) => slug
  )
}

/**
 * @param {{
 *   components: string[]
 *   pages: string[]
 *   tiles: string[]
 *   allowList: Record<string, string>
 * }} input Component folders, slugs with a docs page, slugs with a tile, and
 *   folders deliberately left undocumented.
 */
export function findMissingDocs({ components, pages, tiles, allowList }) {
  const pageSlugs = new Set(pages)
  const tileSlugs = new Set(tiles)
  const hasBoth = (component) =>
    pageSlugs.has(componentSlug(component)) &&
    tileSlugs.has(componentSlug(component))

  const missing = components
    .filter((component) => !(component in allowList))
    .map((component) => ({
      component,
      missing: [
        !pageSlugs.has(componentSlug(component)) && 'docs page',
        !tileSlugs.has(componentSlug(component)) && 'index tile'
      ].filter(Boolean)
    }))
    .filter(({ missing }) => missing.length > 0)

  const staleAllowList = Object.keys(allowList).filter(
    (component) => !components.includes(component) || hasBoth(component)
  )

  return { missing, staleAllowList }
}
