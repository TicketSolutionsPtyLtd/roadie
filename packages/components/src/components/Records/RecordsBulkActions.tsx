'use client'

import { type KeyboardEvent, useLayoutEffect, useRef, useState } from 'react'

import { XIcon } from '@phosphor-icons/react'
import { createPortal, flushSync } from 'react-dom'

import { cn } from '@oztix/roadie-core/utils'

import { Button, IconButton } from '../Button'
import { RecordsSelectionBar } from './RecordsSelectionBar'
import { useRecordsContext } from './context'
import { findScrollParent } from './scrollParent'
import type { RecordName, RecordsBulkAction } from './types'
import { useBulkActions } from './useBulkActions'

// Tailwind's md container, in rem: below it actions show their icons only.
const COMPACT_BELOW = 28

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
  const { records, bulkSlot, setBulkMounted, selectControls } =
    useRecordsContext()
  useLayoutEffect(() => {
    setBulkMounted(true)
    return () => setBulkMounted(false)
  }, [setBulkMounted])
  if (records.selectedCount === 0) return null
  // A layout with a header row, like a wide table, takes the bar there.
  if (bulkSlot)
    return createPortal(
      <RecordsSelectionBar actions={actions} recordName={recordName} />,
      bulkSlot
    )
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
  const placeRef = useRef<() => void>(undefined)
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
    const resize = new ResizeObserver(() => {
      const next = isCompact()
      // Synchronously, so a resize never paints a frame of full labels.
      if (next !== compactNow) flushSync(() => setCompact(next))
      compactNow = next
      if (bar.hasAttribute('data-floating')) place()
    })
    resize.observe(list)
    // Any scroll can move the dock past the footer or the footer itself.
    const follow = () => settle()
    addEventListener('scroll', follow, { capture: true, passive: true })
    return () => {
      observer.disconnect()
      resize.disconnect()
      removeEventListener('scroll', follow, { capture: true })
    }
  }, [])

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
        onKeyDown={(event: KeyboardEvent) => {
          if (event.key !== 'Escape') return
          event.preventDefault()
          if (records.selecting) records.setSelecting(false)
          else clearSelection()
        }}
        className={cn(
          'z-docked flex flex-nowrap items-center gap-2 rounded-full emphasis-floating is-translucent px-3 py-2',
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
        {actions.map((action, index) => (
          <Button
            key={`${action.label}-${index}`}
            size='sm'
            intent={action.intent}
            disabled={running !== null}
            // Focusable while busy, so focus stays on the action that started it.
            focusableWhenDisabled
            aria-busy={running === index || undefined}
            onClick={() => start(index)}
            // Icon-only on narrow records, sized like an IconButton.
            className={
              action.icon && compact ? 'size-8 min-w-8 px-0' : undefined
            }
          >
            {action.icon}
            {action.icon ? (
              <span className={compact ? 'sr-only' : undefined}>
                {action.label}
              </span>
            ) : (
              action.label
            )}
          </Button>
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
        {confirm}
      </div>
    </div>
  )
}
