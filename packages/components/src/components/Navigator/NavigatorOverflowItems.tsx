'use client'

import { type ReactElement, use } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { List } from '../List'
import {
  listItemContentClass,
  listItemLeadingClass,
  listItemTitleClass,
  listItemVariants
} from '../List/variants'
import {
  NavigatorContext,
  isActiveValue,
  isSectionActive
} from './NavigatorContext'
import type { NavigatorMenuProps } from './NavigatorMenu'
import { NavigatorMenuHost, menuId } from './NavigatorMenuHost'
import type { NavigatorSlotMeta } from './mobileSlots'
import { presentNavIcon } from './presentNavIcon'
import { textOf } from './splitSecondary'

export type NavigatorOverflowItemsProps = {
  className?: string
}

type Run = {
  key: string
  group: NavigatorSlotMeta['group']
  slots: NavigatorSlotMeta[]
}

// Consecutive slots that share a group, so a group folded whole stays one
// section and loose items between groups stay loose.
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

/**
 * The folded destinations as a `List`, placed by the consumer inside
 * `Navigator.OverflowPane`. Each orientation's rows show only where that
 * orientation shows.
 */
export function NavigatorOverflowItems({
  className
}: NavigatorOverflowItemsProps) {
  const { overflowItems, value, setValue, setOverflowOpen, openMenu } =
    use(NavigatorContext)

  // List.Item renders its own <li>, so it can't be a menu trigger.
  const renderMenuRow = (
    slot: NavigatorSlotMeta,
    menu: ReactElement<NavigatorMenuProps>
  ) => (
    <li key={slot.value}>
      <NavigatorMenuHost
        surface='overflow'
        value={slot.value}
        menu={menu}
        label={textOf(slot.label) || undefined}
        trigger={
          <button
            type='button'
            data-slot='list-item'
            className={listItemVariants({
              selected: openMenu === menuId('overflow', slot.value)
            })}
          >
            {slot.icon ? (
              <span className={listItemLeadingClass}>
                {presentNavIcon(slot.icon, false, 'size-5')}
              </span>
            ) : null}
            <span
              data-slot='list-item-content'
              className={listItemContentClass}
            >
              <span className={listItemTitleClass}>{slot.label}</span>
            </span>
          </button>
        }
      />
    </li>
  )

  const renderRow = (slot: NavigatorSlotMeta) => {
    if (slot.menu) return renderMenuRow(slot, slot.menu)
    const active = isSectionActive(slot, value)
    return (
      <List.Item
        key={slot.value}
        title={slot.label}
        leading={presentNavIcon(slot.icon, active, 'size-5')}
        href={slot.href}
        current={active && (isActiveValue(slot.value, value) ? 'page' : true)}
        onClick={() => {
          setOverflowOpen(false)
          setValue(slot.value)
        }}
      />
    )
  }

  const renderSet = (slots: NavigatorSlotMeta[], gate: string) =>
    slots.length === 0 ? null : (
      <List
        data-slot='navigator-overflow-items'
        className={cn(gate, className)}
      >
        {toRuns(slots).map((run) =>
          run.group ? (
            <List.Group key={run.key}>
              {run.group.title != null ? (
                <List.GroupTitle>{run.group.title}</List.GroupTitle>
              ) : null}
              {run.slots.map(renderRow)}
            </List.Group>
          ) : (
            run.slots.map(renderRow)
          )
        )}
      </List>
    )

  return (
    <>
      {renderSet(overflowItems.horizontal, 'md:hidden')}
      {renderSet(overflowItems.vertical, 'max-md:hidden')}
    </>
  )
}

NavigatorOverflowItems.displayName = 'Navigator.OverflowItems'
