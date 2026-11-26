'use client'

import { type RefObject, useLayoutEffect, useState } from 'react'

const STAYS_PUT = new Set(['visible', 'clip'])

/** The box `position: sticky` sticks within: any overflow but visible or clip, scrolling or not. */
export function findStickyContainer(node: HTMLElement | null) {
  for (
    let element = node?.parentElement ?? null;
    element;
    element = element.parentElement
  ) {
    const { overflowX, overflowY } = getComputedStyle(element)
    if (!STAYS_PUT.has(overflowX) || !STAYS_PUT.has(overflowY)) return element
  }
  return null
}

/** Tier 0: a pane's header, which every part sticks under when the pane is what scrolls it. */
const PANE_HEADER = 'var(--pane-header-height, 0px)'

/** The parts publishing a height, by `stack/tier` in the order they mounted, and who renders when they change. */
const tiers = new Map<string, HTMLElement[]>()
const listeners = new Map<string, Set<() => void>>()

function changed(stack: string) {
  for (const listener of listeners.get(stack) ?? []) listener()
}

// The first part mounted keeps its tier while it's in the document.
const holderOf = (stack: string, tier: number) =>
  tiers.get(`${stack}/${tier}`)?.find((part) => part.isConnected) ?? null

// One per stack and tier, so two stacks publishing to one element, such as
// two sets of records in a pane, never take or clear each other's height.
const heightOf = (stack: string, tier: number) =>
  `--sticky-${stack.replace(/[^\w-]/g, '')}-${tier}`

export type StickyPartOptions = {
  /** Its place in the stack, from 1: it sticks under the part holding each lower tier in the same box, and under the pane's header when the pane scrolls it. */
  tier: number
  /** Names the stack, such as one set of records' scope, so two stacks in one box keep to their own parts. */
  stack: string
  /**
   * Publishes the part's height for the tiers above, on the closest ancestor
   * this matches, which holds every part sticking under it, or else on its
   * box. Written straight to the style, so a resize renders nothing. The
   * first part mounted at a tier holds it.
   */
  publishOn?: string
  /** Changes when the part may have moved to another box. */
  placement?: unknown
}

/** The `top` for a sticky part, which joins its stack. */
export function useStickyPart(
  ref: RefObject<HTMLElement | null>,
  { tier, stack, publishOn, placement }: StickyPartOptions
) {
  const [top, setTop] = useState(PANE_HEADER)
  const [version, setVersion] = useState(0)
  const publishes = publishOn !== undefined

  // Renders when a part joins or leaves the stack, never when one resizes.
  // Subscribed before paint, so a part mounting beside it in one commit lands.
  useLayoutEffect(() => {
    if (tier <= 1 && !publishes) return
    const set = listeners.get(stack) ?? new Set()
    const onChange = () => setVersion((count) => count + 1)
    listeners.set(stack, set.add(onChange))
    return () => {
      set.delete(onChange)
      if (set.size === 0) listeners.delete(stack)
    }
  }, [stack, tier, publishes])

  useLayoutEffect(() => {
    const element = ref.current
    if (!element || !publishes) return
    const key = `${stack}/${tier}`
    tiers.set(key, [...(tiers.get(key) ?? []), element])
    changed(stack)
    return () => {
      const rest = tiers.get(key)?.filter((part) => part !== element) ?? []
      if (rest.length > 0) tiers.set(key, rest)
      else tiers.delete(key)
      changed(stack)
    }
  }, [ref, stack, tier, publishes])

  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const box = findStickyContainer(element)
    const parts = box?.dataset.slot === 'pane-viewport' ? [PANE_HEADER] : []
    for (let below = 1; below < tier; below++) {
      const part = holderOf(stack, below)
      if (part && findStickyContainer(part) === box)
        parts.push(`var(${heightOf(stack, below)}, 0px)`)
    }
    setTop(
      parts.length > 1 ? `calc(${parts.join(' + ')})` : (parts[0] ?? '0px')
    )
  }, [ref, stack, tier, version, placement])

  useLayoutEffect(() => {
    const element = ref.current
    if (!element || !publishOn || holderOf(stack, tier) !== element) return
    const property = heightOf(stack, tier)
    const target =
      element.closest<HTMLElement>(publishOn) ??
      findStickyContainer(element) ??
      document.documentElement
    const measure = () =>
      target.style.setProperty(property, `${element.offsetHeight}px`)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element, { box: 'border-box' })
    return () => {
      observer.disconnect()
      target.style.removeProperty(property)
    }
  }, [ref, stack, tier, publishOn, version])

  return top
}
