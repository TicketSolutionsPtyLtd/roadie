'use client'

import { type ComponentProps, useEffect, useRef, useState } from 'react'

import { cn } from '@oztix/roadie-core/utils'

export interface MarqueeProps extends ComponentProps<'div'> {
  /** Scroll speed in pixels per second. @default 50 */
  speed?: number
  /** Pause animation on hover. @default false */
  pauseOnHover?: boolean
  /** Scroll direction. @default 'normal' */
  direction?: 'normal' | 'reverse'
  /** Gap between items in pixels. @default 16 */
  gap?: number
  /** Accessible label for the marquee region. */
  'aria-label'?: string
}

export function Marquee({
  children,
  speed = 50,
  pauseOnHover = false,
  direction = 'normal',
  gap = 16,
  className,
  'aria-label': ariaLabel,
  ...props
}: MarqueeProps) {
  const outerRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const [duration, setDuration] = useState(0)
  const [repeats, setRepeats] = useState(1)

  useEffect(() => {
    const outer = outerRef.current
    const measure = measureRef.current
    if (!outer || !measure) return

    const update = () => {
      const containerWidth = outer.clientWidth
      const contentWidth = measure.scrollWidth
      if (contentWidth > 0) {
        // Repeat enough times so one "set" is always wider than the container
        const needed = Math.ceil(containerWidth / contentWidth) + 1
        setRepeats(needed)
      }
    }

    update()

    const observer = new ResizeObserver(update)
    observer.observe(outer)
    observer.observe(measure)
    return () => observer.disconnect()
  }, [children, gap])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    const updateDuration = () => {
      const halfWidth = track.scrollWidth / 2
      if (halfWidth > 0) {
        setDuration(halfWidth / speed)
      }
    }

    updateDuration()

    const observer = new ResizeObserver(updateDuration)
    observer.observe(track)
    return () => observer.disconnect()
  }, [speed, repeats])

  const gapPx = `${gap}px`

  const repeatedChildren = Array.from({ length: repeats }, (_, i) => (
    <div key={i} className='flex shrink-0 items-center' style={{ gap: gapPx }}>
      {children}
    </div>
  ))

  return (
    <div
      ref={outerRef}
      className={cn('relative max-w-full overflow-hidden', className)}
      aria-label={ariaLabel}
      {...props}
    >
      <style>{`
        @keyframes roadie-marquee {
          to { transform: translateX(-50%); }
        }
      `}</style>
      {/* Hidden measure element to get single-set width */}
      <div
        ref={measureRef}
        aria-hidden='true'
        style={{
          position: 'absolute',
          visibility: 'hidden',
          pointerEvents: 'none',
          display: 'flex',
          width: 'max-content',
          height: 0,
          overflow: 'hidden',
          gap: gapPx
        }}
      >
        {children}
      </div>
      <div
        ref={trackRef}
        style={{
          display: 'flex',
          width: 'max-content',
          gap: gapPx,
          animationName: duration > 0 ? 'roadie-marquee' : 'none',
          animationDuration: `${duration}s`,
          animationTimingFunction: 'linear',
          animationIterationCount: 'infinite',
          animationDirection: direction,
          animationPlayState: 'running'
        }}
        onMouseEnter={
          pauseOnHover
            ? (e) => {
                e.currentTarget.style.animationPlayState = 'paused'
              }
            : undefined
        }
        onMouseLeave={
          pauseOnHover
            ? (e) => {
                e.currentTarget.style.animationPlayState = 'running'
              }
            : undefined
        }
      >
        {/* Set A */}
        <div className='flex shrink-0 items-center' style={{ gap: gapPx }}>
          {repeatedChildren}
        </div>
        {/* Set B (clone for seamless loop) */}
        <div
          className='flex shrink-0 items-center'
          style={{ gap: gapPx }}
          aria-hidden='true'
        >
          {repeatedChildren}
        </div>
      </div>
    </div>
  )
}

Marquee.displayName = 'Marquee'
