'use client'

import type { ReactNode } from 'react'

import type { Grouped } from './menuGroups'

type MenuGroupsProps<Item extends Grouped> = {
  /** In group order, from `inGroupOrder`. */
  items: readonly Item[]
  /** The listbox's id, which the headings' ids start with. */
  id: string
  option: (item: Item, index: number) => ReactNode
}

/** A listbox's options under a heading per group; ungrouped ones stand alone. */
export function MenuGroups<Item extends Grouped>({
  items,
  id,
  option
}: MenuGroupsProps<Item>) {
  const runs: { group?: string; start: number; items: Item[] }[] = []
  items.forEach((item, index) => {
    const last = runs.at(-1)
    if (last && last.group === item.group) last.items.push(item)
    else runs.push({ group: item.group, start: index, items: [item] })
  })
  return runs.map(({ group, start, items: grouped }) => {
    const options = grouped.map((item, at) => option(item, start + at))
    if (group === undefined) return options
    const headingId = `${id}-group-${start}`
    return (
      <div
        key={group}
        role='group'
        aria-labelledby={headingId}
        className='grid gap-0.5'
      >
        <div
          id={headingId}
          role='presentation'
          className='px-3 pt-2 pb-1 text-xs font-medium text-subtle select-none'
        >
          {group}
        </div>
        {options}
      </div>
    )
  })
}
