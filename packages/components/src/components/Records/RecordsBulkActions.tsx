'use client'

import {
  Fragment,
  type KeyboardEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from 'react'

import { DotsThreeIcon, XIcon } from '@phosphor-icons/react'
import { createPortal, flushSync } from 'react-dom'

import { cn } from '@oztix/roadie-core/utils'

import { isDev } from '../../utils/isDev'
import { Button, IconButton } from '../Button'
import { Menu } from '../Menu'
import { RecordsSelectionBar, fittingActions } from './RecordsSelectionBar'
import { activeLayout, useRecordsContext } from './context'
import type { RecordName, RecordsBulkAction } from './types'
import { useBulkActions } from './useBulkActions'

let warnedUnselectable = false

// Tailwind's md container, in rem: below it several actions show their icons only.
const COMPACT_BELOW = 28
const MORE = 'More actions'
// The bar's inset from the records' edges, each side, in px.
const BAR_INSET = 16

const width = (element: Element | null | undefined) =>
  element?.getBoundingClientRect().width ?? 0

export type RecordsBulkActionsProps = {
  actions: readonly RecordsBulkAction[]
  /** Overrides the records' `recordName`. */
  recordName?: RecordName
  className?: string
}

export function RecordsBulkActions({
  actions,
  recordName,
  className
}: RecordsBulkActionsProps) {
  const {
    records,
    layouts,
    bulkSlot,
    setBulkMounted,
    selectControls,
    selectMode
  } = useRecordsContext()
  const layout = activeLayout(layouts, records.view)
  const { selectable } = records
  useEffect(() => {
    if (selectable || warnedUnselectable || !isDev()) return
    warnedUnselectable = true
    console.warn(
      '[Roadie] Records.BulkActions needs records that are selectable: pass selectable to useRecords.'
    )
  }, [selectable])
  useLayoutEffect(() => {
    setBulkMounted(true)
    return () => setBulkMounted(false)
  }, [setBulkMounted])
  if (!selectable || records.selectedCount === 0) return null
  // Decided by the layout up front, so a first render never floats a bar the
  // header takes; a layout showing narrow rows has no header, and floats it,
  // unless its rows re-flow and keep the header's slot.
  if (layout?.bulkActions === 'header' && (!selectMode || bulkSlot))
    return bulkSlot
      ? createPortal(
          <RecordsSelectionBar actions={actions} recordName={recordName} />,
          bulkSlot
        )
      : null
  return (
    <StickyBulkBar
      actions={actions}
      recordName={recordName}
      className={className}
      // Select mode's own Deselect all and Done clear it.
      clearable={!selectControls}
    />
  )
}
RecordsBulkActions.displayName = 'Records.BulkActions'

function StickyBulkBar({
  actions,
  recordName,
  className,
  clearable
}: RecordsBulkActionsProps & { clearable: boolean }) {
  const barRef = useRef<HTMLDivElement>(null)
  const {
    records,
    running,
    start,
    confirm,
    clearSelection,
    offerAll,
    selectedLabel,
    allLabel,
    allNoun
  } = useBulkActions({ actions, recordName, barRef })
  const dockRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const fitRef = useRef<() => void>(undefined)
  const [shown, setShown] = useState(actions.length)
  // Measured, not a container query: a Provider has no Root to query.
  const [compact, setCompact] = useState(false)

  // The dock is sticky, so the bar rides the foot of what shows while the
  // records' end doesn't, and rests at their end; only the fit is measured.
  useLayoutEffect(() => {
    const dock = dockRef.current
    const bar = barRef.current
    if (!dock || !bar) return
    const list =
      dock.closest<HTMLElement>('[data-slot="records"]') ??
      dock.parentElement ??
      dock
    const isCompact = () =>
      list.getBoundingClientRect().width <
      COMPACT_BELOW *
        parseFloat(getComputedStyle(document.documentElement).fontSize)
    let compactNow = isCompact()
    setCompact(compactNow)
    // Actions that don't fit the records' width go in More; the first always shows.
    const fit = (sync: boolean) => {
      const measure = measureRef.current
      if (!measure) return
      const part = (slot: string) =>
        measure.querySelectorAll(`[data-slot="${slot}"]`)
      const style = getComputedStyle(bar)
      const gap = parseFloat(style.columnGap) || 0
      const next = fittingActions({
        available:
          width(list) -
          2 * BAR_INSET -
          (parseFloat(style.paddingInlineStart) || 0) -
          (parseFloat(style.paddingInlineEnd) || 0),
        // The count, Select all and Clear, with the gaps between them.
        count: [...part('records-bulk-fixed')].reduce(
          (sum, element, index) => sum + (index > 0 ? gap : 0) + width(element),
          0
        ),
        actions: [...part('records-bulk-action')].map(width),
        more: width(part('records-bulk-more')[0]),
        gap
      })
      const shownNext = Math.max(
        next,
        Math.min(1, part('records-bulk-action').length)
      )
      if (sync) flushSync(() => setShown(shownNext))
      else setShown(shownNext)
    }
    fitRef.current = () => fit(false)
    fit(false)
    const resize = new ResizeObserver(() => {
      const next = isCompact()
      // Synchronously, so a resize never paints a frame of full labels.
      if (next !== compactNow) flushSync(() => setCompact(next))
      compactNow = next
      fit(true)
    })
    resize.observe(list)
    // A web font swap changes the parts' widths without resizing the records.
    if (measureRef.current) resize.observe(measureRef.current)
    return () => resize.disconnect()
  }, [])

  // A lone action has room for its word, and a lone icon is hard to read.
  const iconOnly = compact && actions.length > 1
  const labels = actions.map((action) => action.label).join('\n')
  // A layout effect's own update lands before paint.
  useLayoutEffect(() => {
    fitRef.current?.()
  }, [labels, compact, offerAll, clearable, selectedLabel])

  const actionButton = (
    action: RecordsBulkAction,
    index: number,
    measuring = false
  ) => (
    <Button
      size='sm'
      intent={action.intent}
      {...(measuring
        ? { tabIndex: -1 }
        : {
            disabled: running !== null,
            // Focusable while busy, so focus stays on the action that started it.
            focusableWhenDisabled: true,
            'aria-busy': running === index || undefined,
            onClick: () => start(index)
          })}
      // Sized like an IconButton.
      className={action.icon && iconOnly ? 'size-8 min-w-8 px-0' : undefined}
    >
      {action.icon}
      {action.icon ? (
        <span className={iconOnly ? 'sr-only' : undefined}>{action.label}</span>
      ) : (
        action.label
      )}
    </Button>
  )
  const moreIcon = (
    <DotsThreeIcon weight='bold' className='size-4' aria-hidden />
  )
  const overflow = actions.slice(shown)

  return (
    <div
      ref={dockRef}
      data-slot='records-bulk-dock'
      // Clears a pane's sticky footer; a pane's tab bar padding already insets where it sticks.
      className='pointer-events-none sticky bottom-[calc(var(--pane-sticky-bottom,0px)+1rem+env(safe-area-inset-bottom))] z-docked grid min-h-12 grid-cols-1 justify-items-center px-4'
    >
      <div
        ref={barRef}
        role='group'
        aria-label='Bulk actions'
        data-slot='records-bulk-actions'
        onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
          if (event.key !== 'Escape' || event.defaultPrevented) return
          // A portalled confirm's keys bubble here through React; its Escape is its own.
          if (!event.currentTarget.contains(event.target as Node)) return
          event.preventDefault()
          if (records.selecting) records.setSelecting(false)
          else clearSelection()
        }}
        className={cn(
          'pointer-events-auto relative flex max-w-full flex-nowrap items-center gap-2 rounded-full emphasis-floating is-translucent px-3 py-2',
          className
        )}
      >
        <p className='px-2 text-sm font-semibold whitespace-nowrap text-strong'>
          {selectedLabel}
        </p>
        {offerAll && (
          <Button
            size='sm'
            emphasis='subtler'
            onClick={records.selectAllMatching}
            aria-label={allLabel}
          >
            Select all
            <span className={compact ? 'hidden' : undefined}>{allNoun}</span>
          </Button>
        )}
        {actions.slice(0, shown).map((action, index) => (
          <Fragment key={`${action.label}-${index}`}>
            {actionButton(action, index)}
          </Fragment>
        ))}
        {clearable && (
          <IconButton
            aria-label='Clear selection'
            size='sm'
            emphasis='subtler'
            onClick={clearSelection}
          >
            <XIcon weight='bold' className='size-4' aria-hidden />
          </IconButton>
        )}
        {overflow.length > 0 && (
          <Menu>
            <Menu.Trigger
              render={
                <IconButton
                  size='sm'
                  emphasis='subtler'
                  aria-label={MORE}
                  disabled={running !== null}
                  focusableWhenDisabled
                  aria-busy={
                    (running !== null && running >= shown) || undefined
                  }
                >
                  {moreIcon}
                </IconButton>
              }
            />
            <Menu.Content align='end' side='top'>
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
            <span
              data-slot='records-bulk-fixed'
              className='px-2 text-sm font-semibold whitespace-nowrap'
            >
              {selectedLabel}
            </span>
            {offerAll && (
              <span data-slot='records-bulk-fixed' className='flex'>
                <Button size='sm' emphasis='subtler' tabIndex={-1}>
                  Select all
                  <span className={compact ? 'hidden' : undefined}>
                    {allNoun}
                  </span>
                </Button>
              </span>
            )}
            {clearable && (
              <span data-slot='records-bulk-fixed' className='flex'>
                <IconButton
                  aria-label='Clear selection'
                  size='sm'
                  emphasis='subtler'
                  tabIndex={-1}
                >
                  <XIcon weight='bold' className='size-4' aria-hidden />
                </IconButton>
              </span>
            )}
            {actions.map((action, index) => (
              <span
                key={`${action.label}-${index}`}
                data-slot='records-bulk-action'
                className='flex'
              >
                {actionButton(action, index, true)}
              </span>
            ))}
            <span data-slot='records-bulk-more' className='flex'>
              <IconButton
                size='sm'
                emphasis='subtler'
                aria-label={MORE}
                tabIndex={-1}
              >
                {moreIcon}
              </IconButton>
            </span>
          </div>
        </div>
        {confirm}
      </div>
    </div>
  )
}
