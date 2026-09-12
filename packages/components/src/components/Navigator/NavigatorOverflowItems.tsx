'use client'

import {
  Children,
  type ReactElement,
  cloneElement,
  isValidElement,
  use
} from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { List } from '../List'
import { ListItemContent } from '../List/ListItem'
import { listItemVariants } from '../List/variants'
import {
  NavigatorContext,
  type NavigatorOverflowSets,
  isActiveValue,
  isSectionActive
} from './NavigatorContext'
import type { NavigatorMenuProps } from './NavigatorMenu'
import { NavigatorMenuHost, menuId } from './NavigatorMenuHost'
import {
  NavigatorMenuItem,
  type NavigatorMenuItemProps
} from './NavigatorMenuItem'
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
  const {
    overflowItems,
    value,
    setValue,
    setOverflowOpen,
    openMenu,
    activateItem,
    activateMenuItem
  } = use(NavigatorContext)

  // A folded menu is as old as the last structural change, so its items call through to the current tree.
  const withCurrentHandlers = (
    value: string,
    menu: ReactElement<NavigatorMenuProps>
  ) => {
    let position = 0
    return cloneElement(menu, {
      children: Children.map(menu.props.children, (child) => {
        if (!isValidElement(child) || child.type !== NavigatorMenuItem) {
          return child
        }
        const index = position++
        return cloneElement(child as ReactElement<NavigatorMenuItemProps>, {
          onClick: () => activateMenuItem(value, index)
        })
      })
    })
  }

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
        menu={withCurrentHandlers(slot.value, menu)}
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
    if (slot.menu) return renderMenuRow(set, slot, slot.menu)
    const active = isSectionActive(slot, value)
    return (
      <List.Item
        key={slot.value}
        title={slot.label}
        leading={presentNavIcon(slot.icon, 'size-5 text-subtle')}
        trailing={slot.badge}
        href={slot.href}
        current={active && (isActiveValue(slot.value, value) ? 'page' : true)}
        onClick={() => {
          activateItem(slot.value)
          setOverflowOpen(false)
          setValue(slot.value)
        }}
      />
    )
  }

  const renderSet = (set: keyof NavigatorOverflowSets, gate: string) => {
    const slots = overflowItems[set]
    return slots.length === 0 ? null : (
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

NavigatorOverflowItems.displayName = 'Navigator.OverflowItems'
