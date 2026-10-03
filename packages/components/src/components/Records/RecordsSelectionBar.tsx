'use client'

import { type KeyboardEvent, useLayoutEffect, useRef, useState } from 'react'

import { Toolbar } from '@base-ui/react/toolbar'
import { CaretDownIcon, DotsThreeIcon } from '@phosphor-icons/react'
import { flushSync } from 'react-dom'

import { Button, IconButton } from '../Button'
import { Menu } from '../Menu'
import type { RecordName, RecordsBulkAction } from './types'
import { useBulkActions } from './useBulkActions'

const MORE = 'More actions'

const width = (element: Element | null | undefined) =>
  element?.getBoundingClientRect().width ?? 0

/** How many actions show as buttons; the rest go in More, which needs its own room. */
export function fittingActions({
  available,
  count,
  actions,
  more,
  gap
}: {
  available: number
  count: number
  actions: readonly number[]
  more: number
  gap: number
}) {
  const used = (shown: number) =>
    actions.slice(0, shown).reduce((sum, action) => sum + gap + action, count)
  if (used(actions.length) <= available) return actions.length
  for (let shown = actions.length - 1; shown > 0; shown--)
    if (used(shown) + gap + more <= available) return shown
  return 0
}

export type RecordsSelectionBarProps = {
  actions: readonly RecordsBulkAction[]
  recordName?: RecordName
}

/** The bulk actions in a layout's header row, such as in place of a wide table's column headers. */
export function RecordsSelectionBar({
  actions,
  recordName
}: RecordsSelectionBarProps) {
  const barRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const {
    records,
    running,
    start,
    confirm,
    clearSelection,
    offerAll,
    selectedLabel,
    allLabel
  } = useBulkActions({ actions, recordName, barRef })
  const [shown, setShown] = useState(actions.length)
  // Cleared once the menu has closed: clearing unmounts the trigger its focus returns to.
  const clearing = useRef(false)
  const labels = actions.map((action) => action.label).join('\n')

  useLayoutEffect(() => {
    const bar = barRef.current
    const measure = measureRef.current
    if (!bar || !measure) return
    const fit = () => {
      const part = (slot: string) =>
        measure.querySelectorAll(`[data-slot="${slot}"]`)
      const next = fittingActions({
        available: width(bar),
        count: width(part('records-bulk-count')[0]),
        actions: [...part('records-bulk-action')].map(width),
        more: width(part('records-bulk-more')[0]),
        gap: parseFloat(getComputedStyle(bar).columnGap) || 0
      })
      // Synchronously, so a resize never paints a frame of overflowing buttons.
      flushSync(() => setShown(next))
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(bar)
    observer.observe(measure)
    return () => observer.disconnect()
  }, [labels])

  const busy = { disabled: running !== null, focusableWhenDisabled: true }
  const inline = actions.slice(0, shown)
  const overflow = actions.slice(shown)
  const count = (
    <>
      {selectedLabel}
      <CaretDownIcon weight='bold' className='size-4' aria-hidden />
    </>
  )
  const actionContent = (action: RecordsBulkAction) => (
    <>
      {action.icon}
      {action.label}
    </>
  )

  return (
    <Toolbar.Root
      ref={barRef}
      aria-label='Bulk actions'
      data-slot='records-bulk-actions'
      onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key !== 'Escape' || event.defaultPrevented) return
        // A portalled menu's keys bubble here through React; its Escape is its own.
        if (!event.currentTarget.contains(event.target as Node)) return
        event.preventDefault()
        clearSelection()
      }}
      className='relative flex h-full min-w-0 flex-1 items-center gap-2 pe-2 text-sm font-normal'
    >
      <Menu
        onOpenChangeComplete={(open) => {
          if (open || !clearing.current) return
          clearing.current = false
          clearSelection()
        }}
      >
        <Menu.Trigger
          render={
            <Toolbar.Button
              render={
                <Button size='sm' emphasis='subtler' className='text-strong'>
                  {count}
                </Button>
              }
            />
          }
        />
        <Menu.Content align='start'>
          {offerAll && (
            <Menu.Item onClick={records.selectAllMatching}>
              {allLabel}
            </Menu.Item>
          )}
          <Menu.Item
            onClick={() => {
              clearing.current = true
            }}
          >
            Clear selection
          </Menu.Item>
        </Menu.Content>
      </Menu>
      {inline.map((action, index) => (
        <Toolbar.Button
          key={`${action.label}-${index}`}
          {...busy}
          aria-busy={running === index || undefined}
          onClick={() => start(index)}
          render={
            <Button size='sm' emphasis='subtle' intent={action.intent}>
              {actionContent(action)}
            </Button>
          }
        />
      ))}
      {overflow.length > 0 && (
        <Menu>
          <Menu.Trigger
            render={
              <Toolbar.Button
                {...busy}
                aria-label={MORE}
                aria-busy={(running !== null && running >= shown) || undefined}
                render={
                  <IconButton size='sm' emphasis='subtler' aria-label={MORE}>
                    <DotsThreeIcon
                      weight='bold'
                      className='size-4'
                      aria-hidden
                    />
                  </IconButton>
                }
              />
            }
          />
          <Menu.Content align='start'>
            {overflow.map((action, offset) => (
              <Menu.Item
                key={`${action.label}-${shown + offset}`}
                icon={action.icon}
                intent={action.intent}
                onClick={() => start(shown + offset)}
              >
                {action.label}
              </Menu.Item>
            ))}
          </Menu.Content>
        </Menu>
      )}
      {/* Every part at its natural width, to decide what fits; clipped, so it adds no scrollable overflow. */}
      <div
        aria-hidden
        inert
        className='invisible absolute inset-0 overflow-hidden'
      >
        <div ref={measureRef} className='flex w-max gap-2'>
          <span data-slot='records-bulk-count' className='flex'>
            <Button size='sm' emphasis='subtler' tabIndex={-1}>
              {count}
            </Button>
          </span>
          {actions.map((action, index) => (
            <span
              key={`${action.label}-${index}`}
              data-slot='records-bulk-action'
              className='flex'
            >
              <Button size='sm' emphasis='subtle' tabIndex={-1}>
                {actionContent(action)}
              </Button>
            </span>
          ))}
          <span data-slot='records-bulk-more' className='flex'>
            <IconButton
              size='sm'
              emphasis='subtler'
              aria-label={MORE}
              tabIndex={-1}
            >
              <DotsThreeIcon weight='bold' className='size-4' aria-hidden />
            </IconButton>
          </span>
        </div>
      </div>
      {confirm}
    </Toolbar.Root>
  )
}
RecordsSelectionBar.displayName = 'RecordsSelectionBar'
