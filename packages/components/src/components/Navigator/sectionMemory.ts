/** The last sub-route per item without a Secondary. Empty on reload, so no hydration mismatch. */
export type SectionMemory = ReadonlyMap<string, string>

/** The item you are in keeps its declared href: the URL wins. */
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
