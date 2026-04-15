'use client'

import { useMemo } from 'react'

import type { EmblaCarouselType } from 'embla-carousel'

import {
  type CarouselActions,
  type CarouselState,
  type UseCarouselReturn,
  useCarouselContext
} from './CarouselContext'

/**
 * Access the carousel's state and actions. Must be called inside a
 * `<Carousel>` tree.
 *
 * For escape-hatch access to the underlying Embla instance, use
 * `useCarouselUnsafeEmbla()` — it is intentionally separate so raw-Embla
 * coupling is greppable.
 */
export function useCarousel(): UseCarouselReturn {
  const ctx = useCarouselContext()
  const state = useMemo<CarouselState>(
    () => ({
      direction: ctx.direction,
      selectedIndex: ctx.selectedIndex,
      slideCount: ctx.slideCount,
      snapCount: ctx.snapCount,
      canGoToPrev: ctx.canGoToPrev,
      canGoToNext: ctx.canGoToNext,
      canScroll: ctx.canScroll,
      isPlaying: ctx.isPlaying,
      userPaused: ctx.userPaused,
      labelId: ctx.labelId,
      rootAriaLabel: ctx.rootAriaLabel
    }),
    [
      ctx.direction,
      ctx.selectedIndex,
      ctx.slideCount,
      ctx.snapCount,
      ctx.canGoToPrev,
      ctx.canGoToNext,
      ctx.canScroll,
      ctx.isPlaying,
      ctx.userPaused,
      ctx.labelId,
      ctx.rootAriaLabel
    ]
  )
  const actions = useMemo<CarouselActions>(
    () => ({
      goToPrev: ctx.goToPrev,
      goToNext: ctx.goToNext,
      goTo: ctx.goTo,
      play: ctx.play,
      pause: ctx.pause,
      toggle: ctx.toggle
    }),
    [ctx.goToPrev, ctx.goToNext, ctx.goTo, ctx.play, ctx.pause, ctx.toggle]
  )
  return { state, actions }
}

/**
 * Escape hatch: read the underlying Embla `api` instance directly.
 *
 * Returning Embla's API hard-couples your code to a specific major version
 * of `embla-carousel`. Prefer `useCarousel()` whenever the public state and
 * actions are sufficient. This hook exists so you can grep for raw-Embla
 * usage when planning an upgrade.
 */
export function useCarouselUnsafeEmbla(): EmblaCarouselType | undefined {
  return useCarouselContext().api
}
