'use client'

import { use } from 'react'

import { List } from '../List'
import { NavigatorContext, isSectionActive } from './NavigatorContext'
import { presentNavIcon } from './presentNavIcon'

export type NavigatorOverflowItemsProps = {
  className?: string
}

/**
 * The generated `List` of folded destinations. Placed by the consumer, so the
 * promo card can sit above it or between sections — the ordering is authored,
 * the content is not.
 */
export function NavigatorOverflowItems({
  className
}: NavigatorOverflowItemsProps) {
  const { overflowItems, value, setValue, setOverflowOpen, setOpenPanel } =
    use(NavigatorContext)

  if (overflowItems.length === 0) return null

  return (
    <List className={className}>
      {overflowItems.map((slot) => {
        const active = isSectionActive(slot, value)
        return (
          <List.Item
            key={slot.value}
            title={slot.label}
            leading={presentNavIcon(slot.icon, active, 'size-5')}
            href={slot.href}
            current={active ? 'page' : false}
            onClick={() => {
              setOverflowOpen(false)
              // A folded panel item still owns a menu, not a page.
              if (slot.panel) {
                setOpenPanel(slot.value)
                return
              }
              setValue(slot.value)
            }}
          />
        )
      })}
    </List>
  )
}

NavigatorOverflowItems.displayName = 'Navigator.OverflowItems'
