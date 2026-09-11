import { Fragment, type ReactNode } from 'react'

import type { PrimaryEntry } from './collectSlots'
import type { PrimaryCapsule } from './primaryCapacity'
import { navigatorCapsuleVariants } from './variants'

type ItemEntry = Extract<PrimaryEntry, { kind: 'item' }>
type GroupEntry = Extract<PrimaryEntry, { kind: 'group' }>

type EntryCapsule =
  | { kind: 'run'; key: string; items: ItemEntry[] }
  | { kind: 'group'; key: string; entry: GroupEntry }

function groupEntries(entries: PrimaryEntry[]): EntryCapsule[] {
  const capsules: EntryCapsule[] = []
  let run: Extract<EntryCapsule, { kind: 'run' }> | null = null
  entries.forEach((entry, index) => {
    if (entry.kind === 'item') {
      if (!run) {
        run = { kind: 'run', key: `run-${index}`, items: [] }
        capsules.push(run)
      }
      run.items.push(entry)
      return
    }
    run = null
    capsules.push({ kind: 'group', key: entry.group.key, entry })
  })
  return capsules
}

export function primaryCapsules(entries: PrimaryEntry[]): PrimaryCapsule[] {
  return groupEntries(entries).map((capsule) => ({
    key: capsule.key,
    slots:
      capsule.kind === 'run'
        ? capsule.items.map((item) => item.slot)
        : capsule.entry.slots
  }))
}

const capsuleList = (key: string, rows: { key: string; node: ReactNode }[]) => (
  <ul
    key={key}
    data-slot='navigator-capsule'
    className={navigatorCapsuleVariants()}
  >
    {rows.map((row) => (
      <li key={row.key}>{row.node}</li>
    ))}
  </ul>
)

/** Folded items drop out; a capsule left empty disappears. */
export function wrapCapsules(
  entries: PrimaryEntry[],
  folded: ReadonlySet<string>
): ReactNode[] {
  return groupEntries(entries).flatMap((capsule) => {
    if (capsule.kind === 'group') {
      const allFolded = capsule.entry.slots.every((slot) =>
        folded.has(slot.value)
      )
      return allFolded
        ? []
        : [<Fragment key={capsule.key}>{capsule.entry.element}</Fragment>]
    }
    const items = capsule.items.filter((item) => !folded.has(item.slot.value))
    return items.length === 0
      ? []
      : [
          capsuleList(
            capsule.key,
            items.map((item) => ({ key: item.slot.value, node: item.element }))
          )
        ]
  })
}
