'use client'

import {
  type ComponentProps,
  type MouseEvent,
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useRef
} from 'react'

import { cn } from '@oztix/roadie-core/utils'

import type { BlockEvent } from '../Provider'
import { useMarketingBlocks } from './context'

export type BlockRootProps = Omit<ComponentProps<'section'>, 'onClick'> & {
  block: string
  variant: string
  preset: string
  position?: number
}

const VIEWED_AT = 0.5
// A block over twice the screen's height never shows half of itself, so it also counts once it fills half the screen.
const THRESHOLDS = Array.from(
  { length: 11 },
  (_, step) => (step * VIEWED_AT) / 10
)

function isViewed(entry: IntersectionObserverEntry) {
  if (entry.intersectionRatio >= VIEWED_AT) return true
  const screen = entry.rootBounds?.height ?? window.innerHeight
  return entry.intersectionRect.height >= screen * VIEWED_AT
}

/** The section every block renders in: names the block for analytics and reports its views and clicks. */
export function BlockRoot({
  block,
  variant,
  preset,
  position,
  className,
  children,
  ref: forwardedRef,
  ...props
}: BlockRootProps) {
  const { onBlockEvent } = useMarketingBlocks()
  const ref = useRef<HTMLElement>(null)
  useImperativeHandle(forwardedRef, () => ref.current!)
  const identity = { block, variant, preset, position }
  const reportView = useEffectEvent(() =>
    onBlockEvent?.(event('view', identity))
  )

  const tracking = onBlockEvent != null

  useEffect(() => {
    const element = ref.current
    if (!tracking || !element || typeof IntersectionObserver === 'undefined')
      return
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some(isViewed)) return
        observer.disconnect()
        reportView()
      },
      { threshold: THRESHOLDS }
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [tracking])

  const handleClick = (clicked: MouseEvent<HTMLElement>) => {
    if (!onBlockEvent || !(clicked.target instanceof Element)) return
    const control = clicked.target.closest('a, button')
    if (!control || !clicked.currentTarget.contains(control)) return
    const label =
      control.getAttribute('aria-label') ?? control.textContent?.trim()
    const href = control.getAttribute('href')
    onBlockEvent({
      ...event('click', identity),
      ...(label && { label }),
      ...(href != null && { href })
    })
  }

  return (
    <section
      ref={ref}
      data-block={block}
      data-variant={variant}
      data-preset={preset}
      data-position={position}
      className={cn('@container', className)}
      onClick={handleClick}
      {...props}
    >
      {children}
    </section>
  )
}

function event(
  action: BlockEvent['action'],
  { block, variant, preset, position }: Omit<BlockEvent, 'action'>
): BlockEvent {
  return {
    action,
    block,
    variant,
    preset,
    ...(position != null && { position })
  }
}
