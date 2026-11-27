'use client'

import { type ReactElement, use } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { useRegisteredPalette } from '../CommandPalette/registry'
import { ariaKeyShortcuts } from '../CommandPalette/shortcut'
import { useKeyPlatform } from '../Kbd/platform'
import { List, type ListProps } from '../List'
import { ListItemContent } from '../List/ListItemContent'
import { listItemVariants } from '../List/variants'
import {
  NavigatorActionsContext,
  NavigatorDisclosureContext,
  type NavigatorOverflowSets,
  NavigatorSelectionContext,
  isActiveValue,
  isDestinationActive
} from './NavigatorContext'
import type { NavigatorMenuProps } from './NavigatorMenu'
import { NavigatorMenuHost, menuId } from './NavigatorMenuHost'
import type { NavigatorSlotMeta } from './mobileSlots'
import { presentNavIcon } from './presentNavIcon'
import { opensPalette } from './searchSlot'
import { textOf } from './splitSecondary'
import { useActivation } from './useActivation'

export type NavigatorOverflowItemsProps = Omit<ListProps, 'children'>

type Run = {
  key: string
  group: NavigatorSlotMeta['group']
  slots: NavigatorSlotMeta[]
}

// Consecutive slots sharing a group, so a group folded whole stays one titled group.
function toRuns(slots: NavigatorSlotMeta[]): Run[] {
  const runs: Run[] = []
  for (const slot of slots) {
    const last = runs.at(-1)
    if (last && last.group?.key === slot.group?.key) {
      last.slots.push(slot)
    } else {
      runs.push({ key: slot.value, group: slot.group, slots: [slot] })
    }
  }
  return runs
}

/** The folded destinations as a `List`, each orientation's rows where it shows. */
export function NavigatorOverflowItems({
  className,
  ...props
}: NavigatorOverflowItemsProps) {
  const { activateItem } = use(NavigatorActionsContext)
  const activate = useActivation()
  const { value } = use(NavigatorSelectionContext)
  const { overflowItems, openMenu } = use(NavigatorDisclosureContext)
  const palette = useRegisteredPalette()
  const platform = useKeyPlatform()

  // Opens the palette over More, so closing it comes back here.
  const renderSearchRow = (slot: NavigatorSlotMeta) => (
    <li key={slot.value}>
      <button
        type='button'
        data-slot='list-item'
        aria-keyshortcuts={
          palette ? ariaKeyShortcuts(palette.shortcut, platform) : undefined
        }
        onClick={() => palette?.open()}
        className={listItemVariants({ selected: false })}
      >
        <ListItemContent
          title={slot.label}
          leading={presentNavIcon(slot.icon, 'size-5 text-subtle')}
          chevron={false}
        />
      </button>
    </li>
  )

  // List.Item renders its own <li>, so it can't be a menu trigger.
  const renderMenuRow = (
    set: keyof NavigatorOverflowSets,
    slot: NavigatorSlotMeta,
    menu: ReactElement<NavigatorMenuProps>
  ) => (
    <li key={slot.value}>
      <NavigatorMenuHost
        surface={`overflow-${set}`}
        value={slot.value}
        menu={menu}
        label={textOf(slot.label) || undefined}
        trigger={
          <button
            type='button'
            data-slot='list-item'
            onClick={() => activateItem(slot.value)}
            className={listItemVariants({
              selected: openMenu === menuId(`overflow-${set}`, slot.value)
            })}
          >
            <ListItemContent
              title={slot.label}
              leading={presentNavIcon(slot.icon, 'size-5 text-subtle')}
              trailing={slot.badge}
              chevron={false}
            />
          </button>
        }
      />
    </li>
  )

  const renderRow = (
    set: keyof NavigatorOverflowSets,
    slot: NavigatorSlotMeta
  ) => {
    if (opensPalette(slot)) return renderSearchRow(slot)
    if (slot.menu) return renderMenuRow(set, slot, slot.menu)
    const active = isDestinationActive(slot, value)
    const href = slot.href
    return (
      <List.Item
        key={slot.value}
        title={slot.label}
        leading={presentNavIcon(slot.icon, 'size-5 text-subtle')}
        trailing={slot.badge}
        href={href}
        current={active && (isActiveValue(slot.value, value) ? 'page' : true)}
        onClick={(event) =>
          activate(
            event,
            'overflow',
            { value: slot.value, href },
            { route: value }
          )
        }
      />
    )
  }

  const renderSet = (set: keyof NavigatorOverflowSets, gate: string) => {
    const slots = overflowItems[set]
    return slots.length === 0 ? null : (
      <List
        data-slot='navigator-overflow-items'
        className={cn(gate, className)}
        {...props}
      >
        {toRuns(slots).map((run) =>
          run.group ? (
            <List.Group key={run.key}>
              {run.group.title != null ? (
                <List.GroupTitle>{run.group.title}</List.GroupTitle>
              ) : null}
              {run.slots.map((slot) => renderRow(set, slot))}
            </List.Group>
          ) : (
            run.slots.map((slot) => renderRow(set, slot))
          )
        )}
      </List>
    )
  }

  return (
    <>
      {renderSet('horizontal', 'md:hidden')}
      {renderSet('vertical', 'max-md:hidden')}
    </>
  )
}

NavigatorOverflowItems.displayName = 'NavigatorOverflowItems'
