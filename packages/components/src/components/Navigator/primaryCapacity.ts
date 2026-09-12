import { type NavigatorVisibilityPriority, rankSlots } from './mobileSlots'

// Rem, mirroring the tile, capsule and cluster classes; primaryCapacity.test.ts pins the pairing.
export const PRIMARY_METRICS = {
  tile: 3,
  tileGap: 0.25,
  capsulePad: 0.25,
  capsuleGap: 0.75,
  clusterPad: 0.5,
  // The collapsed brand region's bottom padding, the row the toggle sits in.
  toggleRow: 3
} as const

export type PrimaryMetrics = typeof PRIMARY_METRICS

export type PrimaryCapsule = {
  key: string
  slots: { value: string; priority: NavigatorVisibilityPriority }[]
}

export function capsuleHeight(
  tiles: number,
  metrics: PrimaryMetrics = PRIMARY_METRICS
) {
  if (tiles <= 0) return 0
  return (
    tiles * metrics.tile +
    (tiles - 1) * metrics.tileGap +
    2 * metrics.capsulePad
  )
}

export function clusterHeight(
  tileCounts: number[],
  metrics: PrimaryMetrics = PRIMARY_METRICS
) {
  const present = tileCounts.filter((count) => count > 0)
  return (
    present.reduce((sum, count) => sum + capsuleHeight(count, metrics), 0) +
    Math.max(0, present.length - 1) * metrics.capsuleGap +
    2 * metrics.clusterPad
  )
}

export function fitPrimaryCluster(
  capsules: PrimaryCapsule[],
  available: number,
  metrics: PrimaryMetrics = PRIMARY_METRICS
): { folded: Set<string> } {
  const all = capsules.flatMap((capsule) => capsule.slots)
  if (available <= 0) return { folded: new Set() }
  const ranked = rankSlots(all)
  for (let keep = all.length; keep >= 0; keep -= 1) {
    const kept = new Set(ranked.slice(0, keep).map((slot) => slot.value))
    const counts = capsules.map(
      (capsule) => capsule.slots.filter((slot) => kept.has(slot.value)).length
    )
    const more = keep < all.length ? [1] : []
    if (clusterHeight([...counts, ...more], metrics) <= available) {
      return {
        folded: new Set(
          all.filter((slot) => !kept.has(slot.value)).map((slot) => slot.value)
        )
      }
    }
  }
  return { folded: new Set(all.map((slot) => slot.value)) }
}
