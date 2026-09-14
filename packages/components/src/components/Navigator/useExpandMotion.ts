'use client'

import { type RefObject, useEffect, useRef } from 'react'

import { useIsomorphicLayoutEffect } from '../../utils/useIsomorphicLayoutEffect'

const VERTICAL =
  ':scope > [data-slot="navigator-primary"][data-orientation="vertical"]'
const FRAME = ':scope > [data-slot="navigator-primary-frame"]'
const CONTENT = ':scope > [data-slot="navigator-content"]'

const milliseconds = (duration: string) => {
  const first = duration.split(',')[0]?.trim() ?? ''
  const value = parseFloat(first) || 0
  return first.endsWith('ms') ? value : value * 1000
}

const pixels = (length: string, rem: number) => {
  const value = parseFloat(length) || 0
  return length.trim().endsWith('rem') ? value * rem : value
}

/**
 * Expands and collapses the vertical navigation without laying the content out
 * per frame. The frame animates its width in CSS; the content only translates
 * on the compositor, and the track changes once — at the end of an expand, the
 * start of a collapse.
 */
export function useExpandMotion(
  rootRef: RefObject<HTMLElement | null>,
  expanded: boolean,
  pending: boolean
) {
  const settled = useRef<boolean | null>(null)
  const running = useRef<Animation | null>(null)

  useIsomorphicLayoutEffect(() => {
    if (pending) return
    const was = settled.current
    settled.current = expanded
    if (was === null || was === expanded) return

    const root = rootRef.current
    const nav = root?.querySelector<HTMLElement>(VERTICAL)
    const frame = nav?.querySelector<HTMLElement>(FRAME)
    const content = root?.querySelector<HTMLElement>(CONTENT)
    if (!nav || !frame || !content || typeof content.animate !== 'function') {
      return
    }

    const interrupted = running.current
    const from = interrupted
      ? parseFloat(getComputedStyle(content).translate) || 0
      : null
    interrupted?.cancel()
    running.current = null
    // Held before anything reads layout, so the track never lays out expanded early.
    if (expanded) nav.setAttribute('data-motion', 'expand')
    else nav.removeAttribute('data-motion')

    const frameStyle = getComputedStyle(frame)
    const navStyle = getComputedStyle(nav)
    const rem =
      parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
    const duration = milliseconds(frameStyle.transitionDuration)
    const travel =
      (pixels(navStyle.getPropertyValue('--navigator-primary-expanded'), rem) -
        pixels(
          navStyle.getPropertyValue('--navigator-primary-collapsed'),
          rem
        )) *
      (navStyle.direction === 'rtl' ? -1 : 1)
    // Reduced motion, or hidden below `md`: the track just changes.
    if (duration === 0 || travel === 0 || nav.offsetWidth === 0) {
      nav.removeAttribute('data-motion')
      return
    }

    const start = from ?? (expanded ? 0 : travel)
    const end = expanded ? travel : 0
    const animation = content.animate(
      { translate: [`${start}px`, `${end}px`] },
      {
        duration:
          duration * Math.min(1, Math.abs(end - start) / Math.abs(travel)),
        easing: frameStyle.transitionTimingFunction || 'ease',
        fill: 'forwards'
      }
    )
    running.current = animation
    animation.onfinish = () => {
      if (running.current !== animation) return
      running.current = null
      nav.removeAttribute('data-motion')
      animation.cancel()
    }
  }, [rootRef, expanded, pending])

  useEffect(
    () => () => {
      running.current?.cancel()
      running.current = null
    },
    []
  )
}
