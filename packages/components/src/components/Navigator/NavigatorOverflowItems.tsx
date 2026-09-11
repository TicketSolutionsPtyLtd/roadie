'use client'

import { type ReactElement, use } from 'react'

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
 * The generated `List` of folded destinations. Placed by the consumer, so the
 * promo card can sit above it or between sections — the ordering is authored,
 * the content is not.
 */
export function NavigatorOverflowItems({
  className
}: NavigatorOverflowItemsProps) {
  const { overflowItems, value, setValue, setOverflowOpen, openMenu } =
    use(NavigatorContext)

  if (overflowItems.length === 0) return null

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

  return (
    <List className={className}>
      {toRuns(overflowItems).map((run) =>
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
}

NavigatorOverflowItems.displayName = 'Navigator.OverflowItems'
