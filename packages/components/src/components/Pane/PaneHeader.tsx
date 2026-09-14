'use client'

import {
  Children,
  type ReactNode,
  isValidElement,
  use,
  useEffect,
  useLayoutEffect,
  useRef
} from 'react'

import { CaretLeftIcon, XIcon } from '@phosphor-icons/react'

import { cn } from '@oztix/roadie-core/utils'

import { isDev } from '../../utils/isDev'
import { IconButton } from '../Button/IconButton'
import { PaneChromeContext } from './PaneChromeContext'
import { PaneContext } from './PaneContext'
import { PaneTitle } from './PaneTitle'
import { PaneTitleCompact } from './PaneTitleCompact'
import {
  paneHeaderBackVariants,
  paneHeaderCloseVariants,
  paneHeaderVariants
} from './variants'

export type PaneHeaderProps = {
  /** Back target, as a routed link. Wins over `onBack`; also Close's target unless `onClose` is given. */
  backHref?: string
  /** Names the Back button for assistive tech, as "Back to {label}". */
  backLabel?: string
  /** Back target, as a `<button>`; also Close's handler unless `onClose` is given. */
  onBack?: () => void
  /** Close's handler, overriding `onBack` and `backHref` for Close; never shown on the root pane. */
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
  // An inspector has no depth and never goes up a level.
  const showBack =
    hasTarget && pane !== null && pane.depth !== null && pane.depth !== 0
  const closeHandler = onClose ?? onBack
  const closeHref = closeHandler === undefined ? resolvedBackHref : undefined
  const showClose =
    (closeHandler !== undefined || closeHref !== undefined) &&
    pane !== null &&
    pane.role !== 'inspector' &&
    !pane.isRoot
  const collapsed = pane?.collapsed ?? false

  // `Pane.Title` emits its own echo; the header supplies one only for a `Pane.BodyTitle`.
  const hasHeaderTitle = Children.toArray(children).some(
    (child) => isValidElement(child) && child.type === PaneTitle
  )
  const bodyTitle = pane?.bodyTitle ?? null
  const bothTitles = hasHeaderTitle && bodyTitle !== null

  useEffect(() => {
    if (!isDev() || !bothTitles) return
    console.warn(
      'Pane: a Pane.Title in the header and a Pane.BodyTitle in the content both want the header’s compact echo. Rendering the Pane.Title’s and ignoring the Pane.BodyTitle’s — pick one arrangement.'
    )
  }, [bothTitles])

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

  // Walks the DOM: the pane's ref attaches in an ancestor layout effect, after this one.
  // Keyed on `visible` because panes stay mounted while their header comes and goes.
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
        <div data-slot='pane-back' className={paneHeaderBackVariants()}>
          {resolvedBackHref !== undefined ? (
            <IconButton
              href={resolvedBackHref}
              aria-label={backName}
              emphasis='normal'
            >
              {backIcon}
            </IconButton>
          ) : (
            <IconButton
              onClick={onBack}
              aria-label={backName}
              emphasis='normal'
            >
              {backIcon}
            </IconButton>
          )}
        </div>
      ) : null}
      {showClose ? (
        <div data-slot='pane-close' className={paneHeaderCloseVariants()}>
          {closeHandler !== undefined ? (
            <IconButton
              onClick={closeHandler}
              aria-label='Close'
              emphasis='normal'
            >
              {closeIcon}
            </IconButton>
          ) : (
            <IconButton href={closeHref} aria-label='Close' emphasis='normal'>
              {closeIcon}
            </IconButton>
          )}
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
