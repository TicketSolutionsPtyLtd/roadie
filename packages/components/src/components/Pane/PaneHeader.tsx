'use client'

import {
  Children,
  type ComponentProps,
  type MouseEvent,
  isValidElement,
  use,
  useLayoutEffect,
  useMemo,
  useRef
} from 'react'

import { CaretLeftIcon, XIcon } from '@phosphor-icons/react'

import { cn } from '@oztix/roadie-core/utils'

import { mergeRefs } from '../../utils/mergeRefs'
import { useDevWarning } from '../../utils/useDevWarning'
import { IconButton } from '../Button/IconButton'
import { Drawer } from '../Drawer'
import { PaneChromeContext } from './PaneChromeContext'
import { PaneContext } from './PaneContext'
import { PaneInspectorDrawerContext } from './PaneInspectorContext'
import { PaneStackContext } from './PaneStackContext'
import { PaneTitle } from './PaneTitle'
import { PaneTitleCompact } from './PaneTitleCompact'
import { traverseToBackHref } from './paneBack'
import { paneHeaderEdgeClass, paneHeaderVariants } from './variants'

export type PaneHeaderProps = ComponentProps<'header'> & {
  /** Back's parent route; a plain click traverses to a matching previous entry when it can. Wins over `onBack`. */
  backHref?: string
  /** Names the Back button for assistive tech, as "Back to {label}". */
  backLabel?: string
  /** Back's target, as a click handler. Close uses it unless `onClose` is set. */
  onBack?: () => void
  /** Close's handler. Wins over `onBack` and `backHref` for Close. */
  onClose?: () => void
}

const HEADER_PARTS = [
  '--pane-header-height',
  '--pane-header-measured',
  '--pane-header-rest',
  '--pane-header-row',
  '--pane-header-back',
  '--pane-header-close',
  '--pane-header-floor'
]
const ROW_ONE = new Set(['pane-title-compact', 'pane-actions'])

/** The parts of the header's height Back and Close don't change, which CSS sums as they show (INNO-1678); the measured height wins where the sum misses. */
function publishHeaderParts(header: HTMLElement, paneEl: HTMLElement) {
  // A stretched first row hides its own height while an edge control shows.
  let row = 0
  const set = (name: string, px: number) => {
    const value = `${px}px`
    if (paneEl.style.getPropertyValue(name) !== value)
      paneEl.style.setProperty(name, value)
  }
  return () => {
    const style = getComputedStyle(header)
    const height = parseFloat(style.height) || 0
    if (height === 0) {
      set('--pane-header-measured', 0)
      return
    }
    const pad = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)
    const floor = parseFloat(style.minHeight)
    // The floor is one control tall: Back or Close.
    const control = floor - pad
    let back = 0
    let close = 0
    let edge = 0
    let others = 0
    for (const child of header.children) {
      const slot = (child as HTMLElement).dataset.slot ?? ''
      // The used height: a scale on the compact title would shrink a box.
      const box = parseFloat(getComputedStyle(child).height) || 0
      if (slot === 'pane-back') back = control
      if (slot === 'pane-close') close = control
      if (slot === 'pane-back' || slot === 'pane-close')
        edge = Math.max(edge, box)
      else if (ROW_ONE.has(slot)) others = Math.max(others, box)
    }
    if (edge === 0 || others > control) row = others
    const first = Math.max(row, edge)
    set('--pane-header-rest', height > floor ? height - first : pad)
    set('--pane-header-row', row)
    set('--pane-header-back', back)
    set('--pane-header-close', close)
    set('--pane-header-floor', floor)
    const fit = parseFloat(
      getComputedStyle(paneEl).getPropertyValue('--pane-header-fit')
    )
    if (fit === header.offsetHeight)
      paneEl.style.removeProperty('--pane-header-measured')
    else set('--pane-header-measured', header.offsetHeight)
  }
}

const backIcon = <CaretLeftIcon weight='bold' className='size-5' />
const closeIcon = <XIcon weight='bold' className='size-5' />

/** Sticky chrome at the top of a pane: Back, a compact title, and actions. At least one control tall, even empty, so the server's first paint is where the pane settles. */
export function PaneHeader({
  backHref,
  backLabel,
  onBack,
  onClose,
  children,
  className,
  ref,
  ...props
}: PaneHeaderProps) {
  const pane = use(PaneContext)
  const chrome = use(PaneChromeContext)
  const inDrawer = use(PaneInspectorDrawerContext)
  const trackHeader = use(PaneStackContext)?.trackHeader
  const headerRef = useRef<HTMLElement>(null)
  const setHeaderRef = useMemo(
    () => mergeRefs<HTMLElement>(headerRef, ref),
    [ref]
  )

  // A consumer's onBack is a handler and outranks the orchestrator's link.
  const resolvedBackHref =
    backHref ?? (onBack === undefined ? chrome.backHref : undefined)
  const label =
    backLabel ??
    (backHref === undefined && onBack === undefined
      ? chrome.backLabel
      : undefined)
  const backName = label === undefined ? 'Back' : `Back to ${label}`
  const hasTarget = resolvedBackHref !== undefined || onBack !== undefined
  const showBack =
    hasTarget && pane !== null && pane.depth !== null && pane.depth !== 0
  const closeHandler = onClose ?? onBack
  const closeHref = closeHandler === undefined ? resolvedBackHref : undefined
  const followBackHref =
    resolvedBackHref === undefined
      ? undefined
      : (event: MouseEvent<HTMLElement>) => {
          traverseToBackHref(event)
        }
  const showClose =
    inDrawer ||
    ((closeHandler !== undefined || closeHref !== undefined) &&
      pane !== null &&
      pane.depth !== null &&
      !pane.isRoot)
  const collapsed = pane?.collapsed ?? false

  // `Pane.Title` emits its own echo; the header supplies one only for a `Pane.BodyTitle`.
  const hasHeaderTitle = Children.toArray(children).some(
    (child) => isValidElement(child) && child.type === PaneTitle
  )
  const bodyTitle = pane?.bodyTitle ?? null
  const bothTitles = hasHeaderTitle && bodyTitle !== null

  useDevWarning(
    bothTitles &&
      '[Roadie] Pane.Header has a Pane.Title and the pane a Pane.BodyTitle; the Pane.Title wins.'
  )

  // DOM walk: the pane's ref attaches after this effect.
  useLayoutEffect(() => {
    const header = headerRef.current
    // In the inspector's drawer there's no pane, so the drawer carries it.
    const paneEl = header?.closest<HTMLElement>(
      '[data-slot="pane"], [data-slot="drawer-popup"]'
    )
    if (!header || !paneEl) return

    const publish = inDrawer
      ? () =>
          paneEl.style.setProperty(
            '--pane-header-height',
            `${header.offsetHeight}px`
          )
      : publishHeaderParts(header, paneEl)
    if (!inDrawer) paneEl.setAttribute('data-header', '')

    publish()

    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(publish)
    // Back or Close showing may leave the header's size alone, as beside a
    // row of actions, and the sum still has to be checked.
    const observeChildren = () => {
      observer?.observe(header)
      for (const child of header.children) observer?.observe(child)
    }
    observeChildren()
    const children =
      typeof MutationObserver === 'undefined'
        ? null
        : new MutationObserver(() => {
            observeChildren()
            publish()
          })
    children?.observe(header, { childList: true })
    const untrack = inDrawer ? undefined : trackHeader?.(header)
    return () => {
      observer?.disconnect()
      children?.disconnect()
      untrack?.()
      paneEl.removeAttribute('data-header')
      for (const name of HEADER_PARTS) paneEl.style.removeProperty(name)
    }
  }, [inDrawer, trackHeader])

  return (
    <header
      ref={setHeaderRef}
      data-slot='pane-header'
      data-collapsed={String(collapsed)}
      className={cn(paneHeaderVariants({ collapsed, inDrawer }), className)}
      {...props}
    >
      {showBack ? (
        <div data-slot='pane-back' className={paneHeaderEdgeClass}>
          <IconButton
            href={resolvedBackHref}
            onClick={followBackHref ?? onBack}
            aria-label={backName}
            emphasis='normal'
          >
            {backIcon}
          </IconButton>
        </div>
      ) : null}
      {showClose && inDrawer ? (
        <div data-slot='pane-close' className={paneHeaderEdgeClass}>
          <Drawer.Close
            render={
              <IconButton aria-label='Close' emphasis='normal'>
                {closeIcon}
              </IconButton>
            }
          />
        </div>
      ) : showClose ? (
        <div data-slot='pane-close' className={paneHeaderEdgeClass}>
          <IconButton
            href={closeHref}
            onClick={closeHref === undefined ? closeHandler : followBackHref}
            aria-label='Close'
            emphasis='normal'
          >
            {closeIcon}
          </IconButton>
        </div>
      ) : null}
      {children}
      {bodyTitle !== null && !hasHeaderTitle ? (
        <PaneTitleCompact>{bodyTitle}</PaneTitleCompact>
      ) : null}
    </header>
  )
}

PaneHeader.displayName = 'Pane.Header'
