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
import { PaneContext } from './PaneContext'
import { PaneTitle } from './PaneTitle'
import { PaneTitleCompact } from './PaneTitleCompact'
import {
  paneHeaderBackVariants,
  paneHeaderCloseVariants,
  paneHeaderVariants
} from './variants'

export type PaneHeaderProps = {
  /** Back target, as a routed link. Wins over `onBack`. */
  backHref?: string
  /**
   * Back target, as a `<button>`. Also supplies the Close affordance from
   * `lg` up — a drill-down's "back" and a column's "close" are almost always
   * the same intent, so this one handler covers both bands unless `onClose`
   * overrides it.
   */
  onBack?: () => void
  /**
   * Dismisses this column, overriding `onBack`'s handler for Close when both
   * are given — for the rarer case where closing a column genuinely differs
   * from going back to the previous pane. Roadie doesn't own the arrangement
   * — closing a pane is the consumer's routing or state — so the affordance
   * appears only when this or `onBack` is supplied, and never on the root
   * pane even then. `backHref` does not supply it: a link-based back
   * navigates, and an ✕ that navigates somewhere would misrepresent itself.
   */
  onClose?: () => void
  children?: ReactNode
  className?: string
}

const backIcon = <CaretLeftIcon weight='bold' className='size-5' />
const closeIcon = <XIcon weight='bold' className='size-5' />

/**
 * Sticky chrome at the top of a pane. Renders in place — the orchestrator
 * repositions it as a unit with CSS rather than relocating its contents, so
 * there is never any ambiguity about which pane a slot belongs to.
 *
 * Children stack beneath a top row of three explicit grid columns: the back
 * affordance, a centred compact title, and a direct-child `Pane.Actions`.
 * Neither back nor actions is collected by this component — each claims its
 * own column directly, so the row exists exactly when one of them does.
 */
export function PaneHeader({
  backHref,
  onBack,
  onClose,
  children,
  className
}: PaneHeaderProps) {
  const pane = use(PaneContext)
  const headerRef = useRef<HTMLElement>(null)

  // A `list` pane is the root of the stack — there is nothing to go back to.
  // No surrounding pane is not a licence to draw one either: the affordance
  // pops a stack that doesn't exist.
  const hasTarget = backHref !== undefined || onBack !== undefined
  const showBack = hasTarget && pane !== null && pane.role !== 'list'
  // `onClose` wins when both are given — chosen here, once, so visibility and
  // the click handler can never disagree about which prop won. `backHref`
  // never supplies a Close: a link-based back navigates, and an ✕ that
  // navigates somewhere would misrepresent itself.
  const closeHandler = onClose ?? onBack
  // The root pane never gets a Close, even when a consumer threads a handler
  // uniformly through every pane — the component decides, not the call site.
  // An inspector yields rather than stacks and already has its own reveal
  // affordance, so it is excluded the same way `role !== 'list'` excludes it
  // from Back.
  const showClose =
    closeHandler !== undefined &&
    pane !== null &&
    pane.role !== 'inspector' &&
    !pane.isRoot
  const collapsed = pane?.collapsed ?? false

  // Which arrangement the consumer chose. `Pane.Title` emits its own echo, so
  // the header only supplies one for a content-placed `Pane.BodyTitle`.
  // Matched on element identity over direct children, which is exactly the
  // constraint `Pane.Title` already documents for its grid placement.
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

  // A header with nothing of its own would be an empty sticky bar. A
  // content-placed body title counts: its echo is the header's own content.
  const hasOtherContent = children != null || bodyTitle !== null
  const visible = showBack || showClose || hasOtherContent
  // Back and Close occupy the same cell at opposite bands, so the header can
  // only fully hide at a width when the cell is its sole content *and* only
  // one of the two ever draws there. Both present means the cell always has
  // an occupant, so the header never collapses away.
  const edgeOnly =
    hasOtherContent || (showBack && showClose)
      ? 'none'
      : showBack
        ? 'back'
        : showClose
          ? 'close'
          : 'none'

  // Published on the pane rather than the header so sticky content anywhere
  // inside the pane can offset against it. Measured, not constant: the header
  // grows and shrinks with its title, actions and filter rows independently.
  //
  // Found by walking the DOM rather than through a ref on the pane: the pane's
  // element is attached by ScrollArea's ref composition, which runs as a layout
  // effect on an ancestor — and ancestor layout effects commit after their
  // descendants', so a layout effect here would always read it as null. The
  // header's own ref has no such ordering problem (it's attached before this
  // effect runs), and walking live DOM from it keeps the write on
  // `useLayoutEffect`, pre-paint, with no dependency on Base UI's internal
  // ref-composition timing.
  //
  // Keyed on `visible`, not `[]`: panes stay mounted as the stack moves, so a
  // header that stops drawing is a re-render, not an unmount. Without the dep
  // a covered pane would keep a stale height for a bar that no longer exists,
  // and a pane that becomes top would never publish one at all.
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

    // The observer is optional; the cleanup is not. Bailing out early where
    // `ResizeObserver` is missing would also skip removing the property, and
    // the pane would keep a height for a header that no longer exists.
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
          {backHref !== undefined ? (
            <IconButton href={backHref} aria-label='Back' emphasis='normal'>
              {backIcon}
            </IconButton>
          ) : (
            <IconButton onClick={onBack} aria-label='Back' emphasis='normal'>
              {backIcon}
            </IconButton>
          )}
        </div>
      ) : null}
      {showClose ? (
        <div data-slot='pane-close' className={paneHeaderCloseVariants()}>
          <IconButton
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
