'use client'

import {
  type ComponentProps,
  type FocusEvent as ReactFocusEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import type {
  EmblaCarouselType,
  EmblaOptionsType,
  EmblaPluginType
} from 'embla-carousel'
import AutoplayPlugin from 'embla-carousel-autoplay'
import useEmblaCarousel from 'embla-carousel-react'

import { cn } from '@oztix/roadie-core/utils'

import {
  type CarouselActions,
  CarouselContext,
  type CarouselContextValue,
  type CarouselDirection
} from './CarouselContext'

/**
 * Development-mode check that works across consumer bundlers.
 *
 * Uses `process.env.NODE_ENV` rather than `import.meta.env.DEV` because
 * the latter is Vite-specific — Next.js, Webpack, Rollup, and friends
 * don't populate it, so the dev-only warnings would never fire in those
 * consumer runtimes. Every mainstream bundler replaces
 * `process.env.NODE_ENV` with a string literal at build time; the
 * `typeof process` guard covers the case where a consumer bundler hasn't
 * shimmed `process` on the client. The minimal ambient `process`
 * declaration below keeps us from pulling `@types/node` into the
 * package-wide `types` array, which would otherwise leak Node-only
 * globals into DOM code.
 */
declare const process: { env?: { NODE_ENV?: string } } | undefined

function isDevEnvironment(): boolean {
  return (
    typeof process !== 'undefined' && process?.env?.NODE_ENV !== 'production'
  )
}

/**
 * Embla v9's autoplay plugin can throw from its own methods if `init()`
 * bailed out (e.g. snapList was empty at init time in a test environment).
 * Wrap direct plugin calls so a defensive bail-out doesn't crash the host,
 * and surface the failure via `console.warn` in dev so it isn't swallowed
 * silently — Roadie's React state stays authoritative for isPlaying /
 * userPaused regardless, but the warning makes plugin regressions
 * debuggable.
 */
function safePluginCall(fn: () => void): void {
  try {
    fn()
  } catch (error) {
    if (isDevEnvironment()) {
      console.warn('[Carousel] Autoplay plugin call failed:', error)
    }
  }
}

function usePrefersReducedMotion(): boolean {
  // SSR + first client render always see `false` so server / client markup
  // matches. The real value is applied on the first client effect tick;
  // Embla re-inits if it flips.
  const [prefers, setPrefers] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefers(mql.matches)
    const listener = (e: MediaQueryListEvent) => setPrefers(e.matches)
    mql.addEventListener('change', listener)
    return () => mql.removeEventListener('change', listener)
  }, [])
  return prefers
}

export type CarouselRootProps = Omit<ComponentProps<'div'>, 'onBlur'> & {
  /** Pass-through options for the Embla instance. */
  opts?: EmblaOptionsType
  /** Scroll direction. @default 'horizontal' */
  direction?: CarouselDirection
  /**
   * Autoplay delay in milliseconds, or `false` to disable. When set, an
   * autoplay plugin is wired internally and pauses on hover / focus / pointer
   * interaction. A persistent pause control via `<Carousel.PlayPause>` is
   * strongly recommended for WCAG 2.2.2 compliance.
   * @default false
   */
  autoPlay?: number | false
  /** Accessible name for the carousel region. */
  'aria-label'?: string
}

export function CarouselRoot({
  opts,
  direction = 'horizontal',
  autoPlay = false,
  children,
  className,
  'aria-label': ariaLabel,
  ...props
}: CarouselRootProps) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const axis: 'x' | 'y' = direction === 'vertical' ? 'y' : 'x'
  const hasAutoPlay = autoPlay !== false

  // Dev warnings — moved to effects so React 19 strict-mode double-invoke
  // doesn't fire them twice during render.
  useEffect(() => {
    if (!isDevEnvironment()) return
    if (autoPlay !== false && autoPlay < 2000) {
      console.warn(
        '[Carousel] autoPlay delay < 2000ms may fail WCAG 2.2.1 timing; prefer >= 4000ms.'
      )
    }
  }, [autoPlay])

  useEffect(() => {
    if (!isDevEnvironment()) return
    if (opts?.axis && opts.axis !== axis) {
      console.warn(
        `[Carousel] opts.axis="${opts.axis}" conflicts with direction="${direction}". direction wins.`
      )
    }
  }, [opts?.axis, axis, direction])

  const plugins = useMemo<EmblaPluginType[]>(() => {
    if (!hasAutoPlay || prefersReducedMotion) return []
    return [
      AutoplayPlugin({
        delay: autoPlay as number,
        stopOnLastSnap: false
      })
    ]
  }, [autoPlay, prefersReducedMotion, hasAutoPlay])

  const resolvedOpts = useMemo<EmblaOptionsType>(
    () => ({
      align: 'start',
      slidesToScroll: 'auto',
      ...opts,
      axis,
      duration: prefersReducedMotion ? 0 : (opts?.duration ?? 25)
    }),
    [opts, axis, prefersReducedMotion]
  )

  const [emblaRef, api] = useEmblaCarousel(resolvedOpts, plugins)

  const [selectedIndex, setSelectedIndex] = useState(0)
  const [slideCount, setSlideCount] = useState(0)
  const [snapCount, setSnapCount] = useState(0)
  const [labelId, setLabelId] = useState<string | undefined>(undefined)
  const [slidesInView, setSlidesInView] = useState<number[]>([0])

  const [isPlaying, setIsPlaying] = useState(
    () => hasAutoPlay && !prefersReducedMotion
  )
  const [userPaused, setUserPaused] = useState(false)
  const userPausedRef = useRef(false)

  const loop = opts?.loop === true

  const onSelectFiredRef = useRef(false)
  const onSelect = useCallback((emblaApi: EmblaCarouselType) => {
    onSelectFiredRef.current = true
    setSelectedIndex(emblaApi.selectedSnap())
  }, [])

  useEffect(() => {
    if (!api) return
    onSelect(api)
    api.on('reinit', onSelect).on('select', onSelect)
    return () => {
      api.off('reinit', onSelect).off('select', onSelect)
    }
  }, [api, onSelect])

  const onSlidesInView = useCallback((emblaApi: EmblaCarouselType) => {
    const next = emblaApi.slidesInView()
    setSlidesInView(next.length > 0 ? next : [emblaApi.selectedSnap()])
    setSnapCount(emblaApi.snapList().length)
  }, [])

  useEffect(() => {
    if (!api) return
    onSlidesInView(api)
    api
      .on('reinit', onSlidesInView)
      .on('slidesinview', onSlidesInView)
      .on('resize', onSlidesInView)
      .on('slideschanged', onSlidesInView)
    return () => {
      api
        .off('reinit', onSlidesInView)
        .off('slidesinview', onSlidesInView)
        .off('resize', onSlidesInView)
        .off('slideschanged', onSlidesInView)
    }
  }, [api, onSlidesInView])

  // Focus drop guard — when a select event fires, if focus was inside the
  // previous (about-to-become-inert) slide, move focus to the new slide's
  // wrapper so it doesn't drop to <body>.
  useEffect(() => {
    if (!api) return
    const handleSelect = (emblaApi: EmblaCarouselType) => {
      if (typeof document === 'undefined') return
      const activeEl = document.activeElement as HTMLElement | null
      if (!activeEl || !activeEl.isConnected) return
      const prevSlide = activeEl.closest('[aria-roledescription="slide"]')
      if (!prevSlide || activeEl === prevSlide) return
      const newSlideIndex = emblaApi.selectedSnap()
      requestAnimationFrame(() => {
        const newSlide = emblaApi.slideNodes()[newSlideIndex]
        newSlide?.focus({ preventScroll: true })
      })
    }
    api.on('select', handleSelect)
    return () => {
      api.off('select', handleSelect)
    }
  }, [api])

  useEffect(() => {
    if (!api) return
    const plugin = api.plugins().autoplay
    if (!plugin) return
    if (userPausedRef.current) return
    safePluginCall(plugin.play)
  }, [api, plugins])

  useEffect(() => {
    setIsPlaying(hasAutoPlay && !prefersReducedMotion)
    if (!hasAutoPlay || prefersReducedMotion) {
      setUserPaused(false)
      userPausedRef.current = false
    }
  }, [hasAutoPlay, prefersReducedMotion])

  useEffect(() => {
    api?.reInit()
  }, [api, slideCount])

  const effectiveSnapCount = snapCount > 0 ? snapCount : slideCount
  const clampedIndex =
    effectiveSnapCount > 0
      ? Math.min(Math.max(0, selectedIndex), effectiveSnapCount - 1)
      : 0
  const canGoToPrev = effectiveSnapCount > 1 && (loop || clampedIndex > 0)
  const canGoToNext =
    effectiveSnapCount > 1 && (loop || clampedIndex < effectiveSnapCount - 1)
  const canScroll = effectiveSnapCount > 1

  const actions = useMemo<CarouselActions>(
    () => ({
      goToPrev: () => {
        onSelectFiredRef.current = false
        api?.goToPrev()
        if (onSelectFiredRef.current) return
        setSelectedIndex((current) => {
          if (current > 0) return current - 1
          return loop ? Math.max(0, effectiveSnapCount - 1) : current
        })
      },
      goToNext: () => {
        onSelectFiredRef.current = false
        api?.goToNext()
        if (onSelectFiredRef.current) return
        setSelectedIndex((current) => {
          if (current < effectiveSnapCount - 1) return current + 1
          return loop ? 0 : current
        })
      },
      goTo: (index: number) => {
        onSelectFiredRef.current = false
        api?.goTo(index)
        if (onSelectFiredRef.current) return
        setSelectedIndex(Math.max(0, Math.min(index, effectiveSnapCount - 1)))
      },
      play: () => {
        if (!hasAutoPlay) return
        userPausedRef.current = false
        setUserPaused(false)
        setIsPlaying(true)
        const plugin = api?.plugins().autoplay
        if (plugin) safePluginCall(plugin.play)
      },
      pause: () => {
        if (!hasAutoPlay) return
        userPausedRef.current = true
        setUserPaused(true)
        setIsPlaying(false)
        const plugin = api?.plugins().autoplay
        if (plugin) safePluginCall(plugin.stop)
      },
      toggle: () => {
        if (!hasAutoPlay) return
        const next = !isPlaying
        userPausedRef.current = !next
        setUserPaused(!next)
        setIsPlaying(next)
        const plugin = api?.plugins().autoplay
        if (plugin) safePluginCall(next ? plugin.play : plugin.stop)
      }
    }),
    [api, hasAutoPlay, isPlaying, loop, effectiveSnapCount]
  )

  const handleMouseEnter = useCallback(() => {
    if (userPausedRef.current) return
    const plugin = api?.plugins().autoplay
    if (plugin) safePluginCall(plugin.pause)
  }, [api])

  const handleMouseLeave = useCallback(() => {
    if (userPausedRef.current) return
    const plugin = api?.plugins().autoplay
    if (plugin) safePluginCall(plugin.play)
  }, [api])

  const handleFocusIn = useCallback(() => {
    if (userPausedRef.current) return
    const plugin = api?.plugins().autoplay
    if (plugin) safePluginCall(plugin.pause)
  }, [api])

  const handleFocusOut = useCallback(
    (e: ReactFocusEvent<HTMLDivElement>) => {
      if (userPausedRef.current) return
      const related = e.relatedTarget as Node | null
      const currentTarget = e.currentTarget
      const resume = () => {
        const plugin = api?.plugins().autoplay
        if (plugin) safePluginCall(plugin.play)
      }
      if (!related) {
        requestAnimationFrame(() => {
          if (
            currentTarget.isConnected &&
            !currentTarget.contains(document.activeElement)
          ) {
            resume()
          }
        })
        return
      }
      if (!currentTarget.contains(related)) {
        resume()
      }
    },
    [api]
  )

  const contextValue = useMemo<CarouselContextValue>(
    () => ({
      direction,
      selectedIndex: clampedIndex,
      slideCount,
      snapCount: effectiveSnapCount,
      canGoToPrev,
      canGoToNext,
      canScroll,
      isPlaying,
      userPaused,
      labelId,
      rootAriaLabel: ariaLabel,
      goToPrev: actions.goToPrev,
      goToNext: actions.goToNext,
      goTo: actions.goTo,
      play: actions.play,
      pause: actions.pause,
      toggle: actions.toggle,
      api,
      emblaRef,
      setSlideCount,
      setLabelId,
      loop,
      autoPlay,
      slidesInView
    }),
    [
      direction,
      clampedIndex,
      slideCount,
      effectiveSnapCount,
      canGoToPrev,
      canGoToNext,
      canScroll,
      isPlaying,
      userPaused,
      labelId,
      ariaLabel,
      actions,
      api,
      emblaRef,
      loop,
      autoPlay,
      slidesInView
    ]
  )

  return (
    <CarouselContext value={contextValue}>
      <div
        role='region'
        aria-roledescription='carousel'
        aria-label={labelId ? undefined : ariaLabel}
        aria-labelledby={labelId}
        data-slot='carousel'
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocusIn}
        onBlur={handleFocusOut}
        className={cn('relative', className)}
        {...props}
      >
        {children}
      </div>
    </CarouselContext>
  )
}

CarouselRoot.displayName = 'Carousel.Root'
