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
import { findScrollParent } from './scrollParent'
import type { RecordName, RecordsBulkAction } from './types'
import { useBulkActions } from './useBulkActions'

let warnedUnselectable = false

// Tailwind's md container, in rem: below it actions show their icons only.
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
  // header takes; a layout showing narrow rows has no header, and floats it.
  if (layout?.bulkActions === 'header' && !selectMode)
    return bulkSlot
      ? createPortal(
          <RecordsSelectionBar actions={actions} recordName={recordName} />,
          bulkSlot
        )
      : null
  return (
    <FloatingBulkBar
      actions={actions}
      recordName={recordName}
      className={className}
      // Select mode's own Deselect all and Done clear it.
      clearable={!selectControls}
    />
  )
}
RecordsBulkActions.displayName = 'Records.BulkActions'

function FloatingBulkBar({
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
  const placeRef = useRef<() => void>(undefined)
  const fitRef = useRef<() => void>(undefined)
  const [shown, setShown] = useState(actions.length)
  const [floating, setFloating] = useState(false)
  // Measured, not a container query: a container frames the fixed bar, and a Provider has no Root to query.
  const [compact, setCompact] = useState(false)
  useLayoutEffect(() => {
    if (floating) placeRef.current?.()
  }, [floating])

  // Floats at the foot of the screen while the records show but their end
  // doesn't; fixed, so no clipped or non-scrolling ancestor can trap it.
  useLayoutEffect(() => {
    const dock = dockRef.current
    const bar = barRef.current
    if (!dock || !bar) return
    const list =
      dock.closest<HTMLElement>('[data-slot="records"]') ??
      dock.parentElement ??
      dock
    // The foot of what shows: the screen, a shorter scroll box, or its own pane's footer.
    const scroller = findScrollParent(list)
    const pane = list.closest('[data-slot="pane"]')
    const footer = pane
      ? [...pane.querySelectorAll('[data-slot="pane-footer"]')].find(
          (element) => element.closest('[data-slot="pane"]') === pane
        )
      : undefined
    const visibleTop = () =>
      Math.max(0, scroller?.getBoundingClientRect().top ?? 0)
    const visibleBottom = () =>
      Math.min(
        innerHeight,
        scroller?.getBoundingClientRect().bottom ?? innerHeight,
        footer?.getBoundingClientRect().top ?? innerHeight
      )
    const place = () => {
      const box = list.getBoundingClientRect()
      const centre = box.left + box.width / 2
      bar.style.left = `${centre}px`
      bar.style.maxWidth = `${Math.max(box.width - 32, 0)}px`
      bar.style.removeProperty('bottom')
      if (!bar.hasAttribute('data-floating')) return
      // A transformed or contained ancestor, like a pane at rest, frames fixed
      // elements instead of the screen; correct by where the bar actually lands.
      const at = bar.getBoundingClientRect()
      bar.style.left = `${2 * centre - (at.left + at.width / 2)}px`
      const below = at.bottom - (visibleBottom() - 16)
      if (below > 0)
        bar.style.bottom = `${parseFloat(getComputedStyle(bar).bottom) + below}px`
    }
    placeRef.current = place
    // From live boxes: a dock behind a sticky footer still intersects the screen.
    const settle = () => {
      const bottom = visibleBottom()
      const whole = list.getBoundingClientRect()
      const next =
        dock.getBoundingClientRect().bottom > bottom &&
        whole.top < bottom &&
        whole.bottom > visibleTop()
      if (next && bar.hasAttribute('data-floating')) place()
      if (!next) bar.style.removeProperty('left')
      if (!next) bar.style.removeProperty('max-width')
      if (!next) bar.style.removeProperty('bottom')
      setFloating(next)
    }
    const observer = new IntersectionObserver(settle)
    observer.observe(dock)
    if (list !== dock) observer.observe(list)
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
      if (bar.hasAttribute('data-floating')) place()
    })
    resize.observe(list)
    // A web font swap changes the parts' widths without resizing the records.
    if (measureRef.current) resize.observe(measureRef.current)
    // Any scroll can move the dock past the footer or the footer itself.
    const follow = () => settle()
    addEventListener('scroll', follow, { capture: true, passive: true })
    return () => {
      observer.disconnect()
      resize.disconnect()
      removeEventListener('scroll', follow, { capture: true })
    }
  }, [])

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
      // Icon-only on narrow records, sized like an IconButton.
      className={action.icon && compact ? 'size-8 min-w-8 px-0' : undefined}
    >
      {action.icon}
      {action.icon ? (
        <span className={compact ? 'sr-only' : undefined}>{action.label}</span>
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
      className='grid min-h-12 justify-items-center'
    >
      <div
        ref={barRef}
        data-floating={floating || undefined}
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
          'relative z-docked flex flex-nowrap items-center gap-2 rounded-full emphasis-floating is-translucent px-3 py-2',
          'data-floating:fixed data-floating:bottom-[calc(1rem+env(safe-area-inset-bottom))] data-floating:-translate-x-1/2',
          // A Navigator's phone tab bar sits at the foot of the screen.
          'max-md:in-[[data-stack]]:data-floating:bottom-[calc(6rem+env(safe-area-inset-bottom))]',
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
