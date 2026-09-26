'use client'

import {
  type CSSProperties,
  type ComponentProps,
  type ReactNode,
  type RefObject,
  isValidElement,
  useCallback,
  useId,
  useRef,
  useState
} from 'react'

import { Collapsible as CollapsiblePrimitive } from '@base-ui/react/collapsible'

import { cn } from '@oztix/roadie-core/utils'

import { type RoadieRenderProp, resolveRender } from '../../utils/resolveRender'
import { useIsomorphicLayoutEffect } from '../../utils/useIsomorphicLayoutEffect'
import { useCollapsibleOpen } from './CollapsibleContext'

export type CollapsibleTextProps = Omit<
  ComponentProps<'p'>,
  'children' | 'onToggle'
> & {
  children?: ReactNode
  /** How many lines show while closed. */
  lines?: number
  /** The closed trigger's label, shown after a decorative ellipsis. */
  moreLabel?: ReactNode
  /** The open trigger's label. `null` expands only, with no way back. */
  lessLabel?: ReactNode | null
  /** Swap the paragraph for another element, such as `<div />`. */
  render?: RoadieRenderProp
}

function transitionMs(element: HTMLElement) {
  const [first = '0s'] = getComputedStyle(element).transitionDuration.split(',')
  const value = parseFloat(first)
  return first.trim().endsWith('ms') ? value : value * 1000
}

function animateHeight(
  element: HTMLElement,
  from: number,
  to: number,
  animating: RefObject<boolean>,
  onDone: () => void
) {
  animating.current = true
  // Pin the start with the transition off, so Chromium's interpolate-size
  // doesn't animate the jump from the clamp or from auto.
  element.style.transition = 'none'
  element.style.maxHeight = 'none'
  element.style.height = `${from}px`
  void element.offsetHeight
  element.style.transition = ''
  element.style.height = `${to}px`

  const stop = () => {
    element.removeEventListener('transitionend', onEnd)
    clearTimeout(timer)
  }
  const finish = () => {
    stop()
    element.style.transition = 'none'
    element.style.height = ''
    element.style.maxHeight = ''
    void element.offsetHeight
    element.style.transition = ''
    animating.current = false
    onDone()
  }
  const onEnd = (event: TransitionEvent) => {
    if (event.target === element && event.propertyName === 'height') finish()
  }
  element.addEventListener('transitionend', onEnd)
  // transitionend never fires when from and to match.
  const timer = setTimeout(finish, transitionMs(element) + 50)
  return stop
}

export function CollapsibleText({
  children,
  lines = 3,
  moreLabel = 'more',
  lessLabel = 'Show less',
  render,
  className,
  ...props
}: CollapsibleTextProps) {
  const open = useCollapsibleOpen('Collapsible.Text')
  const [overflowing, setOverflowing] = useState(false)
  const [moreWidth, setMoreWidth] = useState<number>()
  const contentId = useId()
  const contentRef = useRef<HTMLElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const animating = useRef(false)
  const mounted = useRef(false)

  const clampedHeight = useCallback(
    (element: HTMLElement) =>
      parseFloat(getComputedStyle(element).lineHeight) * lines,
    [lines]
  )

  const measure = useCallback(() => {
    const element = contentRef.current
    if (!element || animating.current) return
    const limit = element.hasAttribute('data-clamped')
      ? element.clientHeight
      : clampedHeight(element)
    if (!Number.isNaN(limit)) setOverflowing(element.scrollHeight > limit + 1)
  }, [clampedHeight])

  useIsomorphicLayoutEffect(() => {
    measure()
    const element = contentRef.current
    if (!element || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [measure, children])

  useIsomorphicLayoutEffect(() => {
    if (overflowing && !open && triggerRef.current)
      setMoreWidth(triggerRef.current.offsetWidth)
  }, [overflowing, open, moreLabel])

  useIsomorphicLayoutEffect(() => {
    const element = contentRef.current
    if (!mounted.current || !element) {
      mounted.current = true
      return
    }
    if (open && lessLabel === null) element.focus({ preventScroll: true })
    const clamped = clampedHeight(element)
    if (!overflowing || Number.isNaN(clamped)) return
    const full = element.scrollHeight
    const from = animating.current
      ? element.getBoundingClientRect().height
      : open
        ? clamped
        : full
    return animateHeight(
      element,
      from,
      open ? full : clamped,
      animating,
      measure
    )
    // Only a change of `open` animates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const Content =
    render === undefined || (isValidElement(render) && render.type === 'p')
      ? 'span'
      : 'div'
  const showTrigger = overflowing && (!open || lessLabel !== null)

  return resolveRender(
    'p',
    {
      ...props,
      'data-slot': 'collapsible-text',
      className: cn('relative', className),
      children: (
        <>
          <Content
            ref={contentRef as RefObject<HTMLDivElement>}
            id={contentId}
            data-slot='collapsible-text-content'
            data-clamped={open ? undefined : ''}
            data-overflowing={overflowing ? '' : undefined}
            tabIndex={lessLabel === null ? -1 : undefined}
            className='outline-none'
            style={
              {
                '--collapsible-lines': lines,
                '--collapsible-more-width':
                  moreWidth === undefined ? undefined : `${moreWidth}px`
              } as CSSProperties
            }
          >
            {children}
          </Content>
          {showTrigger && (
            <CollapsiblePrimitive.Trigger
              ref={triggerRef}
              data-slot='collapsible-text-trigger'
              aria-controls={contentId}
              className={cn(
                'is-interactive rounded-sm font-medium text-strong',
                !open && 'absolute end-0 bottom-0'
              )}
            >
              {open ? (
                lessLabel
              ) : (
                <>
                  <span aria-hidden>…</span>
                  {moreLabel}
                </>
              )}
            </CollapsiblePrimitive.Trigger>
          )}
        </>
      )
    },
    render
  )
}

CollapsibleText.displayName = 'Collapsible.Text'
