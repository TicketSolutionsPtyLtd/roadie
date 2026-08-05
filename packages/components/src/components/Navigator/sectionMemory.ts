/**
 * Per-section stack memory: the last destination the user reached inside each
 * primary section, so returning to that section lands where they left it —
 * the way each iOS tab owns its own `NavigationStack`.
 *
 * The **URL is the only source of truth** for the current section's depth.
 * This Map supplies a target only for sections the user is not currently in,
 * so it affects link targets and never rendered arrangement. On reload it is
 * empty and every section link falls back to its declared href — no
 * persistence, and therefore no hydration mismatch.
 */
export type SectionMemory = ReadonlyMap<string, string>

/**
 * Where a section's rail row and tab should point. The section you are in
 * keeps its declared href: retargeting it would fight the URL, which wins.
 */
export function rememberedHref(
  memory: SectionMemory,
  section: string,
  declared: string | undefined,
  isBranchActive: boolean
): string | undefined {
  if (isBranchActive) return declared
  return memory.get(section) ?? declared
}

/** Identity-stable when nothing changed, so writing it cannot loop. */
export function nextMemory(
  memory: SectionMemory,
  section: string,
  href: string
): SectionMemory {
  if (memory.get(section) === href) return memory
  const next = new Map(memory)
  next.set(section, href)
  return next
}

/**
 * The href to remember for the destination the user is on. A declared href
 * wins; otherwise the value itself, but only when it is path-shaped — an
 * opaque value like `'orders'` is not something a link can point at, and
 * guessing would produce a broken target rather than no target.
 */
export function activeHref(
  activeValue: string | undefined,
  declaredHref: string | undefined
): string | undefined {
  if (declaredHref !== undefined) return declaredHref
  if (activeValue !== undefined && activeValue.startsWith('/')) {
    return activeValue
  }
  return undefined
}
