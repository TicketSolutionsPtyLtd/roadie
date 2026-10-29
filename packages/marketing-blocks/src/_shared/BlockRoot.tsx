'use client'

import { type ComponentProps, type MouseEvent, useEffect, useRef } from 'react'

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

/** The section every block renders in: names the block for analytics and reports its views and clicks. */
export function BlockRoot({
  block,
  variant,
  preset,
  position,
  className,
  children,
  ...props
}: BlockRootProps) {
  const { onBlockEvent } = useMarketingBlocks()
  const ref = useRef<HTMLElement>(null)
  const identity = { block, variant, preset, position }
  const latest = useRef({ onBlockEvent, identity })
  latest.current = { onBlockEvent, identity }

  const tracking = onBlockEvent != null

  useEffect(() => {
    const element = ref.current
    if (!tracking || !element || typeof IntersectionObserver === 'undefined')
      return
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.intersectionRatio >= VIEWED_AT))
          return
        observer.disconnect()
        latest.current.onBlockEvent?.(event('view', latest.current.identity))
      },
      { threshold: VIEWED_AT }
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
