import type { Headline, PackageKey, ReleaseView } from '@/lib/releases'

export type Shown = { release: ReleaseView; headline: Headline }

/** A release as one package saw it, or null when it left that package alone. */
export function filterRelease(
  release: ReleaseView,
  key: PackageKey | null
): Shown | null {
  if (!key) return { release, headline: release.headlines.all }
  const headline = release.headlines[key]
  if (!headline) return null
  return {
    headline,
    release: {
      ...release,
      versions: release.versions.filter((version) => version.package === key),
      cards: release.cards.filter((card) => card.packages.includes(key)),
      items: release.items.filter((item) => item.packages.includes(key))
    }
  }
}
