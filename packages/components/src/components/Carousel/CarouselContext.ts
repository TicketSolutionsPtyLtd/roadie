'use client'

import { type Dispatch, type SetStateAction, createContext, use } from 'react'

import type { EmblaCarouselType } from 'embla-carousel'

export type CarouselDirection = 'horizontal' | 'vertical'

export type CarouselActions = {
  goToPrev: () => void
  goToNext: () => void
  goTo: (index: number) => void
  play: () => void
  pause: () => void
  toggle: () => void
}

export type CarouselState = {
  direction: CarouselDirection
  /** Selected snap index (0-based). Note: a snap may cover multiple slides. */
  selectedIndex: number
  /** Number of `Carousel.Item` children. Used for "N of M" slide labels. */
  slideCount: number
  /**
   * Number of distinct Embla scroll snap positions. May be smaller than
   * `slideCount` for multi-visible layouts (e.g. `basis-1/3` with 4 cards
   * creates 2 snaps), or equal to it for single-slide layouts. Falls back
   * to `slideCount` in environments where Embla can't measure (jsdom).
   */
  snapCount: number
  canGoToPrev: boolean
  canGoToNext: boolean
  /**
   * True when there is somewhere to scroll to. False when every slide
   * already fits in the viewport (snapCount <= 1) — in which case
   * Previous / Next / Dots / Controls all hide themselves.
   */
  canScroll: boolean
  isPlaying: boolean
  userPaused: boolean
  labelId: string | undefined
  rootAriaLabel: string | undefined
}

export type UseCarouselReturn = {
  state: CarouselState
  actions: CarouselActions
}

// Single root context. The previous design split state / actions / refs /
// internal across four contexts; in practice every subcomponent reads from
// most of them, render-perf isn't a concern at this scale, and the four-way
// split was pure boilerplate. The per-item context (CarouselItemContext)
// stays separate because its lifecycle is driven by Carousel.Content's
// children loop, not the root.
export type CarouselContextValue = CarouselState &
  CarouselActions & {
    api: EmblaCarouselType | undefined
    emblaRef: (node: HTMLElement | null) => void
    setSlideCount: (count: number) => void
    setLabelId: Dispatch<SetStateAction<string | undefined>>
    loop: boolean
    autoPlay: number | false
    /** Indices of slides currently intersecting the viewport. */
    slidesInView: number[]
  }

export const CarouselContext = createContext<CarouselContextValue | null>(null)

export type CarouselItemContextValue = {
  index: number
  total: number
  /** True when this slide is the carousel's selected snap point. */
  isActive: boolean
  /**
   * True when this slide currently intersects the viewport. Multi-visible
   * layouts (e.g. `basis-1/3`) have several in-view slides at once;
   * `inert` should follow visibility, not just selection, so every visible
   * slide remains interactive.
   */
  isInView: boolean
}

export const CarouselItemContext =
  createContext<CarouselItemContextValue | null>(null)

export function useCarouselContext(): CarouselContextValue {
  const ctx = use(CarouselContext)
  if (!ctx)
    throw new Error('Carousel subcomponent must be used inside <Carousel>')
  return ctx
}

export function useCarouselItem(): CarouselItemContextValue {
  const ctx = use(CarouselItemContext)
  if (!ctx)
    throw new Error(
      '<Carousel.Item> must be a direct child of <Carousel.Content>'
    )
  return ctx
}
