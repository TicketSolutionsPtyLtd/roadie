import type { NavigationDestination } from '@/components/Navigation'

export type PageCommand = { label: string; href: string; keywords: string[] }
export type PageCommandGroup = { label: string; items: PageCommand[] }

const command = (
  label: string,
  href: string,
  section: string,
  description?: string
): PageCommand => ({
  label,
  href,
  keywords: [description, section].filter((word) => word !== undefined)
})

function sectionPages(destination: NavigationDestination): PageCommand[] {
  const { title: section } = destination
  if (destination.groups)
    return destination.groups.flatMap((group) => [
      ...(group.overviewHref
        ? [command(`${group.name} overview`, group.overviewHref, section)]
        : []),
      ...group.entries
        // A cross listing repeats a page another section owns.
        .filter((entry) => !entry.crossListedFrom)
        .map((entry) =>
          command(entry.title, entry.href, section, entry.description)
        )
    ])
  return destination.items.flatMap((item) =>
    item.href && item.href !== destination.href
      ? [command(item.title, item.href, section, item.description)]
      : []
  )
}

/**
 * Every docs page as a palette command, grouped by its Navigator section.
 * `pinned` pages, which Navigator shows outside the sections, join the first.
 */
export function pageCommands(
  destinations: readonly NavigationDestination[],
  pinned: readonly PageCommand[] = []
): PageCommandGroup[] {
  return destinations.map((destination, index) => ({
    label: destination.title,
    items: [
      command(destination.title, destination.href, destination.title),
      ...sectionPages(destination),
      ...(index === 0 ? pinned : [])
    ]
  }))
}
