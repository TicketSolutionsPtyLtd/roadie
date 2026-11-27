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

export type PrimaryCapsule = {
  key: string
  slots: { value: string; priority: NavigatorVisibilityPriority }[]
}

const metrics = PRIMARY_METRICS

function capsuleHeight(tiles: number) {
  if (tiles <= 0) return 0
  return (
    tiles * metrics.tile +
    (tiles - 1) * metrics.tileGap +
    2 * metrics.capsulePad
  )
}

function clusterHeight(tileCounts: number[]) {
  const present = tileCounts.filter((count) => count > 0)
  return (
    present.reduce((sum, count) => sum + capsuleHeight(count), 0) +
    Math.max(0, present.length - 1) * metrics.capsuleGap +
    2 * metrics.clusterPad
  )
}

function heightKeeping(
  capsules: PrimaryCapsule[],
  kept: ReadonlySet<string>,
  folds: boolean
) {
  const counts = capsules.map(
    (capsule) => capsule.slots.filter((slot) => kept.has(slot.value)).length
  )
  return clusterHeight(folds ? [...counts, 1] : counts)
}

/**
 * The height, in rem, each item needs to stay out of More, and the height at
 * which More goes: what `fitPrimaryCluster` decides, as thresholds CSS can
 * apply before anything is measured.
 */
export function foldThresholds(capsules: PrimaryCapsule[]): {
  slots: Map<string, number>
  all: number
} {
  const ranked = rankSlots(capsules.flatMap((capsule) => capsule.slots))
  const heights = ranked.map((_, keep) =>
    heightKeeping(
      capsules,
      new Set(ranked.slice(0, keep).map((slot) => slot.value)),
      true
    )
  )
  const all = heightKeeping(
    capsules,
    new Set(ranked.map((slot) => slot.value)),
    false
  )
  // An item stays once any count that keeps it fits, so the least of those.
  const slots = new Map<string, number>()
  let least = all
  for (let keep = ranked.length; keep >= 1; keep -= 1) {
    if (keep < ranked.length) least = Math.min(least, heights[keep]!)
    slots.set(ranked[keep - 1]!.value, least)
  }
  return { slots, all }
}

export function fitPrimaryCluster(
  capsules: PrimaryCapsule[],
  available: number
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
    if (clusterHeight([...counts, ...more]) <= available) {
      return {
        folded: new Set(
          all.filter((slot) => !kept.has(slot.value)).map((slot) => slot.value)
        )
      }
    }
  }
  return { folded: new Set(all.map((slot) => slot.value)) }
}
