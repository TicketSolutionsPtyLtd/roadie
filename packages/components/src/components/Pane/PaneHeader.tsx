'use client'

import {
  Children,
  type ReactNode,
  isValidElement,
  use,
  useLayoutEffect,
  useRef
} from 'react'

import { CaretLeftIcon, XIcon } from '@phosphor-icons/react'

import { cn } from '@oztix/roadie-core/utils'

import { useDevWarning } from '../../utils/useDevWarning'
import { IconButton } from '../Button/IconButton'
import { PaneChromeContext } from './PaneChromeContext'
import { PaneContext } from './PaneContext'
import { PaneTitle } from './PaneTitle'
import { PaneTitleCompact } from './PaneTitleCompact'
import { paneHeaderEdgeClass, paneHeaderVariants } from './variants'

export type PaneHeaderProps = {
  /** Back's target, as a routed link. Wins over `onBack` for Back. */
  backHref?: string
  /** Names the Back button for assistive tech, as "Back to {label}". */
  backLabel?: string
  /** Back's target, as a click handler. Close uses it unless `onClose` is set. */
  onBack?: () => void
  /** Close's handler. Wins over `onBack` and `backHref` for Close. */
  onClose?: () => void
  children?: ReactNode
  className?: string
}

const backIcon = <CaretLeftIcon weight='bold' className='size-5' />
const closeIcon = <XIcon weight='bold' className='size-5' />

/** Sticky chrome at the top of a pane: Back, a compact title, and actions. */
export function PaneHeader({
  backHref,
  backLabel,
  onBack,
  onClose,
  children,
  className
}: PaneHeaderProps) {
  const pane = use(PaneContext)
  const chrome = use(PaneChromeContext)
  const headerRef = useRef<HTMLElement>(null)

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
  const showClose =
    (closeHandler !== undefined || closeHref !== undefined) &&
    pane !== null &&
    pane.depth !== null &&
    !pane.isRoot
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

  const hasOtherContent = children != null || bodyTitle !== null
  const visible = showBack || showClose || hasOtherContent
  const edgeOnly = hasOtherContent
    ? 'none'
    : showBack && showClose
      ? 'both'
      : showBack
        ? 'back'
        : showClose
          ? 'close'
          : 'none'

  // DOM walk: the pane's ref attaches after this effect. Keyed on `visible`, as headers come and go.
  useLayoutEffect(() => {
    const header = headerRef.current
    const paneEl = header?.closest<HTMLElement>('[data-slot="pane"]')
    if (!header || !paneEl) return

    const publish = () =>
      paneEl.style.setProperty(
        '--pane-header-height',
        `${header.offsetHeight}px`
      )

    publish()

    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(publish)
    observer?.observe(header)
    return () => {
      observer?.disconnect()
      paneEl.style.removeProperty('--pane-header-height')
    }
  }, [visible])

  if (!visible) return null

  return (
    <header
      ref={headerRef}
      data-slot='pane-header'
      data-collapsed={String(collapsed)}
      className={cn(paneHeaderVariants({ edgeOnly, collapsed }), className)}
    >
      {showBack ? (
        <div data-slot='pane-back' className={paneHeaderEdgeClass}>
          <IconButton
            href={resolvedBackHref}
            onClick={resolvedBackHref === undefined ? onBack : undefined}
            aria-label={backName}
            emphasis='normal'
          >
            {backIcon}
          </IconButton>
        </div>
      ) : null}
      {showClose ? (
        <div data-slot='pane-close' className={paneHeaderEdgeClass}>
          <IconButton
            href={closeHref}
            onClick={closeHandler}
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
