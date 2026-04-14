'use client'

import {
  Children,
  type ComponentProps,
  type Dispatch,
  type ElementType,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type Ref,
  type SetStateAction,
  createContext,
  isValidElement,
  use,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import {
  ArrowRightIcon,
  CaretDownIcon,
  CaretLeftIcon,
  CaretRightIcon,
  CaretUpIcon,
  PauseIcon,
  PlayIcon
} from '@phosphor-icons/react/ssr'
import { type VariantProps, cva } from 'class-variance-authority'
import type {
  EmblaCarouselType,
  EmblaOptionsType,
  EmblaPluginType
} from 'embla-carousel'
import AutoplayPlugin from 'embla-carousel-autoplay'
import useEmblaCarousel from 'embla-carousel-react'

import { cn } from '@oztix/roadie-core/utils'

import { IconButton, type IconButtonProps } from '../Button/IconButton'

/**
 * Development-mode check using import.meta.env (Vite/tsdown) with a safe
 * fallback. Avoids importing @types/node just for process.env.NODE_ENV.
 */
function isDevEnvironment(): boolean {
  const meta = import.meta as unknown as { env?: { DEV?: boolean } }
  return meta.env?.DEV === true
}

/**
 * Embla v9's autoplay plugin can throw from its own methods if `init()`
 * bailed out (e.g. snapList was empty at init time in a test environment).
 * Wrap direct plugin calls so a defensive bail-out doesn't crash the host.
 */
function safePluginCall(fn: () => void): void {
  try {
    fn()
  } catch {
    // No-op — the plugin is in a degraded state and our React state is
    // still the source of truth for isPlaying / userPaused.
  }
}

/* ─── prefers-reduced-motion hook ─── */

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

/* ─── Types ─── */

type CarouselDirection = 'horizontal' | 'vertical'

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
  selectedIndex: number
  slideCount: number
  canGoToPrev: boolean
  canGoToNext: boolean
  isPlaying: boolean
  userPaused: boolean
  labelId: string | undefined
  rootAriaLabel: string | undefined
}

export type UseCarouselReturn = {
  state: CarouselState
  actions: CarouselActions
}

/* ─── Context ─── */
//
// Single root context. The previous design split state / actions / refs /
// internal across four contexts; in practice every subcomponent reads from
// most of them, render-perf isn't a concern at this scale, and the four-way
// split was pure boilerplate. The per-item context (CarouselItemContext)
// stays separate because its lifecycle is driven by Carousel.Content's
// children loop, not the root.

type CarouselContextValue = CarouselState &
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

const CarouselContext = createContext<CarouselContextValue | null>(null)

type CarouselItemContextValue = {
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

const CarouselItemContext = createContext<CarouselItemContextValue | null>(null)

function useCarouselContext(): CarouselContextValue {
  const ctx = use(CarouselContext)
  if (!ctx)
    throw new Error('Carousel subcomponent must be used inside <Carousel>')
  return ctx
}

function useCarouselItem(): CarouselItemContextValue {
  const ctx = use(CarouselItemContext)
  if (!ctx)
    throw new Error(
      '<Carousel.Item> must be a direct child of <Carousel.Content>'
    )
  return ctx
}

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
      canGoToPrev: ctx.canGoToPrev,
      canGoToNext: ctx.canGoToNext,
      isPlaying: ctx.isPlaying,
      userPaused: ctx.userPaused,
      labelId: ctx.labelId,
      rootAriaLabel: ctx.rootAriaLabel
    }),
    [
      ctx.direction,
      ctx.selectedIndex,
      ctx.slideCount,
      ctx.canGoToPrev,
      ctx.canGoToNext,
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

/* ─── Variants ─── */

// `overflow: clip` + `overflow-clip-margin` lets card shadows bleed out
// beyond the viewport box. Unlike `overflow: hidden` + padding, this only
// extends the clip region for *painted output* — it does not add layout
// space inside the viewport, so slides can't visibly drift into the bleed
// region. 2 × `--spacing` = 8px is enough for `shadow-md` (~6–10px) on
// every side.
export const carouselContentVariants = cva(
  'relative overflow-clip focus-visible:outline-none',
  {
    variants: {
      direction: {
        horizontal: '-my-4 py-4',
        vertical: ''
      }
    },
    defaultVariants: { direction: 'horizontal' }
  }
)

export const carouselContainerVariants = cva('flex', {
  variants: {
    direction: {
      horizontal: '-ml-4',
      vertical: '-mt-4 h-full flex-col'
    }
  },
  defaultVariants: { direction: 'horizontal' }
})

export const carouselItemVariants = cva(
  'min-h-0 min-w-0 shrink-0 grow-0 basis-full',
  {
    variants: {
      direction: {
        horizontal: 'pl-4',
        vertical: 'pt-4'
      }
    },
    defaultVariants: { direction: 'horizontal' }
  }
)

export const carouselDotsVariants = cva('flex items-center justify-center', {
  variants: {
    direction: {
      horizontal: 'flex-row gap-1.5',
      vertical: 'flex-col gap-1.5'
    }
  },
  defaultVariants: { direction: 'horizontal' }
})

/* ─── Root ─── */

export interface CarouselProps extends Omit<ComponentProps<'div'>, 'onBlur'> {
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

export function Carousel({
  opts,
  direction = 'horizontal',
  autoPlay = false,
  children,
  className,
  'aria-label': ariaLabel,
  ...props
}: CarouselProps) {
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
      ...opts,
      axis,
      duration: prefersReducedMotion ? 0 : (opts?.duration ?? 25)
    }),
    [opts, axis, prefersReducedMotion]
  )

  const [emblaRef, api] = useEmblaCarousel(resolvedOpts, plugins)

  // slideCount is authoritative from Carousel.Content's children. Embla's
  // snapList() is empty in jsdom and the default 1-snap-per-slide case
  // matches children.length 1:1 in real browsers, so this is the simpler
  // single source of truth.
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [slideCount, setSlideCount] = useState(0)
  const [labelId, setLabelId] = useState<string | undefined>(undefined)
  // Indices of slides currently intersecting the viewport. Initialized to
  // [0] so the first paint marks slide 0 as in-view (jsdom never fires the
  // slidesinview event, so this also covers the default test fixture).
  // Real browsers update via the slidesinview event below.
  const [slidesInView, setSlidesInView] = useState<number[]>([0])

  // isPlaying / userPaused are React state. The actions and hover/focus
  // handlers update userPausedRef *synchronously* alongside setUserPaused,
  // so any read in the same tick sees the latest value (no one-frame stale
  // window from waiting on an effect commit).
  const [isPlaying, setIsPlaying] = useState(
    () => hasAutoPlay && !prefersReducedMotion
  )
  const [userPaused, setUserPaused] = useState(false)
  const userPausedRef = useRef(false)

  const loop = opts?.loop === true

  // ── Embla state sync ──
  // In real browsers, Embla's `select` event fires synchronously after a
  // navigation call and onSelect updates selectedIndex authoritatively.
  // In jsdom, snapList() is empty and `select` never fires, so the action
  // handlers below also poke state optimistically as a fallback. Embla
  // wins on the next select event in real browsers — the only residual
  // race is a click landing in the microsecond before Embla finishes its
  // first init, which is documented but accepted.
  const onSelect = useCallback((emblaApi: EmblaCarouselType) => {
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

  // ── Embla in-view sync ──
  // For multi-visible layouts (basis-1/3 etc.) every slide that intersects
  // the viewport must stay interactive — gating `inert` on selectedSnap
  // alone leaves the other visible slides un-clickable, which was the bug
  // reported in https://… (carousel inert traps non-selected visible
  // cards). Embla emits `slidesinview` whenever the set changes.
  const onSlidesInView = useCallback((emblaApi: EmblaCarouselType) => {
    const next = emblaApi.slidesInView()
    setSlidesInView(next.length > 0 ? next : [emblaApi.selectedSnap()])
  }, [])

  useEffect(() => {
    if (!api) return
    onSlidesInView(api)
    api.on('reinit', onSlidesInView).on('slidesinview', onSlidesInView)
    return () => {
      api.off('reinit', onSlidesInView).off('slidesinview', onSlidesInView)
    }
  }, [api, onSlidesInView])

  // ── Focus drop guard ──
  // When a select event fires, if focus was inside the previous (about-to-
  // become-inert) slide, move focus to the new slide's wrapper so it
  // doesn't drop to <body>. The focus call is deferred via
  // requestAnimationFrame so React can commit the inert flip first —
  // otherwise we'd .focus() a still-inert element and browsers would
  // silently drop the call.
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

  // ── Autoplay startup ──
  // Roadie owns isPlaying entirely in React state. We don't subscribe to
  // Embla's autoplay:play/autoplay:stop events because (a) v9's autoplay
  // plugin doesn't auto-start, and (b) if our effect runs twice (React 19
  // strict-mode double-invoke), the cleanup's stop() call would emit
  // autoplay:stop and clobber our state. Instead we call plugin.play()
  // imperatively when api becomes available, defensively wrapped because
  // v9's plugin can throw if its own init bailed out (e.g. snapList empty
  // in jsdom).
  useEffect(() => {
    if (!api) return
    const plugin = api.plugins().autoplay
    if (!plugin) return
    if (userPausedRef.current) return
    safePluginCall(plugin.play)
  }, [api, plugins])

  // Reset isPlaying when autoplay configuration changes.
  useEffect(() => {
    setIsPlaying(hasAutoPlay && !prefersReducedMotion)
    if (!hasAutoPlay || prefersReducedMotion) {
      setUserPaused(false)
      userPausedRef.current = false
    }
  }, [hasAutoPlay, prefersReducedMotion])

  // ── Re-init on slide count change ──
  useEffect(() => {
    api?.reInit()
  }, [api, slideCount])

  // canGoToPrev / canGoToNext use a clamped index so we don't have to keep
  // a separate effect to clamp selectedIndex when children shrink. Embla's
  // reinit handler updates selectedIndex via onSelect already; clamping at
  // read time covers the transient gap before that lands.
  const clampedIndex =
    slideCount > 0 ? Math.min(Math.max(0, selectedIndex), slideCount - 1) : 0
  const canGoToPrev = slideCount > 1 && (loop || clampedIndex > 0)
  const canGoToNext = slideCount > 1 && (loop || clampedIndex < slideCount - 1)

  // ── Actions ──
  // Navigation actions delegate to Embla AND update selectedIndex
  // optimistically. In real browsers Embla's select event fires
  // synchronously and re-asserts the same value via onSelect; in jsdom
  // (where select doesn't fire) the optimistic update is the only path
  // that keeps state in sync. play/pause/toggle drive React state directly
  // and call the plugin defensively. userPausedRef is updated synchronously
  // inside each action so any read in the same tick sees the latest value.
  const actions = useMemo<CarouselActions>(
    () => ({
      goToPrev: () => {
        api?.goToPrev()
        setSelectedIndex((current) => {
          if (current > 0) return current - 1
          return loop ? Math.max(0, slideCount - 1) : current
        })
      },
      goToNext: () => {
        api?.goToNext()
        setSelectedIndex((current) => {
          if (current < slideCount - 1) return current + 1
          return loop ? 0 : current
        })
      },
      goTo: (index: number) => {
        api?.goTo(index)
        setSelectedIndex(Math.max(0, Math.min(index, slideCount - 1)))
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
    [api, hasAutoPlay, isPlaying, loop, slideCount]
  )

  // ── Hover / focus pause handlers (on the root wrapper) ──
  // These pause the *plugin* (transient — `pause()` not `stop()`), but
  // do not touch React state. The aria-live mode only flips on explicit
  // user pause via PlayPause — transient pauses don't retrigger
  // announcements. All plugin calls are defensive.
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
      // Safari quirk: relatedTarget can be null for some blur events.
      // Defer one RAF and re-read document.activeElement instead of
      // trusting the synthetic event payload.
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
      // State
      direction,
      selectedIndex: clampedIndex,
      slideCount,
      canGoToPrev,
      canGoToNext,
      isPlaying,
      userPaused,
      labelId,
      rootAriaLabel: ariaLabel,
      // Actions
      goToPrev: actions.goToPrev,
      goToNext: actions.goToNext,
      goTo: actions.goTo,
      play: actions.play,
      pause: actions.pause,
      toggle: actions.toggle,
      // Refs / internal
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
      canGoToPrev,
      canGoToNext,
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
    <CarouselContext.Provider value={contextValue}>
      <div
        role='region'
        aria-roledescription='carousel'
        aria-label={labelId ? undefined : ariaLabel}
        aria-labelledby={labelId}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocusIn}
        onBlur={handleFocusOut}
        className={cn('relative', className)}
        {...props}
      >
        {children}
      </div>
    </CarouselContext.Provider>
  )
}

Carousel.displayName = 'Carousel'

/* ─── Header ─── */

export type CarouselHeaderProps = ComponentProps<'div'>

export function CarouselHeader({ className, ...props }: CarouselHeaderProps) {
  return (
    <div
      className={cn('mb-2 flex items-center justify-between gap-4', className)}
      {...props}
    />
  )
}

CarouselHeader.displayName = 'Carousel.Header'

/* ─── Title ─── */
//
// Two sibling components instead of one polymorphic generic:
//
//   <Carousel.Title>Featured</Carousel.Title>
//     → renders an <h2> (or another heading via `as`).
//
//   <Carousel.TitleLink href='/events'>Featured</Carousel.TitleLink>
//     → renders an <a> (or framework Link via `as`) with a trailing arrow
//       icon and link styling.
//
// The previous polymorphic <Carousel.Title as={…} href={…}> shape allowed
// `<Title as='h2' href='/x'>` which produced invalid HTML at runtime.
// Splitting kills the type unsoundness and the runtime branch.

type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'

export type CarouselTitleProps = ComponentProps<'h2'> & {
  /** Heading level. Defaults to `<h2>`. */
  as?: HeadingLevel
}

function useRegisterTitleLabel(titleId: string) {
  const { setLabelId } = useCarouselContext()
  // Register this title as the carousel's accessible name. The cleanup
  // only clears labelId if it still points at *this* title — guards
  // against responsive remounts where two titles fight over labelId.
  useEffect(() => {
    setLabelId(titleId)
    return () => {
      setLabelId((current) => (current === titleId ? undefined : current))
    }
  }, [titleId, setLabelId])
}

export function CarouselTitle({
  as: Component = 'h2',
  className,
  children,
  id,
  ...props
}: CarouselTitleProps) {
  const generatedId = useId()
  const titleId = id ?? generatedId
  useRegisterTitleLabel(titleId)

  return (
    <Component
      id={titleId}
      className={cn('text-display-ui-6 text-strong', className)}
      {...props}
    >
      {children}
    </Component>
  )
}

CarouselTitle.displayName = 'Carousel.Title'

type CarouselTitleLinkOwnProps<T extends ElementType> = {
  /**
   * Render the link as a custom element/component (e.g. Next.js `Link`).
   * Defaults to `<a>`.
   */
  as?: T
  /** DOM id for `aria-labelledby`. Defaults to a generated id. */
  id?: string
}

export type CarouselTitleLinkProps<T extends ElementType = 'a'> =
  CarouselTitleLinkOwnProps<T> &
    Omit<ComponentProps<T>, keyof CarouselTitleLinkOwnProps<T>>

export function CarouselTitleLink<T extends ElementType = 'a'>({
  as,
  className,
  children,
  id,
  ...props
}: CarouselTitleLinkProps<T>) {
  const generatedId = useId()
  const titleId = id ?? generatedId
  useRegisterTitleLabel(titleId)

  const Component = (as ?? 'a') as ElementType

  return (
    <Component
      id={titleId}
      className={cn(
        'group/title is-interactive flex items-center gap-1 text-display-ui-5 text-strong',
        className
      )}
      {...props}
    >
      {children}
      <ArrowRightIcon
        weight='bold'
        className='size-5 text-subtle transition-transform group-hover/title:translate-x-1 group-hover/title:intent-accent'
      />
    </Component>
  )
}

CarouselTitleLink.displayName = 'Carousel.TitleLink'

/* ─── Content ─── */

export interface CarouselContentProps extends ComponentProps<'div'> {
  /** Props to forward to the inner Embla container (flex row/col). */
  containerProps?: ComponentProps<'div'>
}

export function CarouselContent({
  className,
  children,
  containerProps,
  onKeyDown,
  ...props
}: CarouselContentProps) {
  const {
    direction,
    selectedIndex,
    slideCount,
    slidesInView,
    isPlaying,
    labelId,
    rootAriaLabel,
    goToPrev,
    goToNext,
    goTo,
    emblaRef,
    setSlideCount
  } = useCarouselContext()

  // aria-live is `off` while autoplay is actively running, `polite`
  // otherwise. Transient hover/focus pauses don't change isPlaying, so
  // they don't retrigger announcements either.
  const ariaLive: 'off' | 'polite' = isPlaying ? 'off' : 'polite'

  // Authoritative slide count comes from Carousel.Content's own children.
  // useLayoutEffect ensures the count is set before paint so the first
  // render of Dots / Previous / Next sees the correct value.
  const childCount = Children.count(children)
  useLayoutEffect(() => {
    setSlideCount(childCount)
  }, [childCount, setSlideCount])

  // Dev-mode child-shape check — kept in an effect so React 19 strict-mode
  // double-invoke doesn't fire it twice. The displayName check intentionally
  // skips wrappers; the runtime useCarouselItem() throw is the real
  // guardrail.
  useEffect(() => {
    if (!isDevEnvironment()) return
    Children.forEach(children, (child) => {
      if (
        isValidElement(child) &&
        (child.type as { displayName?: string })?.displayName !==
          'Carousel.Item'
      ) {
        console.warn(
          '[Carousel] <Carousel.Content> only supports direct <Carousel.Item> children. Fragments and conditional children are not unwrapped.'
        )
      }
    })
  }, [children])

  // Inject per-item context so each <Carousel.Item> can read its index /
  // total without lifting state. `isInView` drives the inert attribute so
  // every visible slide stays interactive in multi-visible layouts; the
  // selectedSnap is exposed separately as `isActive`.
  const inViewSet = useMemo(() => new Set(slidesInView), [slidesInView])
  const wrappedChildren = Children.map(children, (child, index) => {
    if (!isValidElement(child)) return child
    const itemContext: CarouselItemContextValue = {
      index,
      total: childCount,
      isActive: index === selectedIndex,
      isInView: inViewSet.has(index)
    }
    return (
      <CarouselItemContext.Provider key={index} value={itemContext}>
        {child}
      </CarouselItemContext.Provider>
    )
  })

  const handleKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(e)
      if (e.defaultPrevented) return

      // Ignore arrow keys when focus is on an interactive element inside a
      // slide — the user is likely navigating within slide content.
      const target = e.target as HTMLElement
      if (target !== e.currentTarget) {
        const isInSlide = target.closest(
          '[role="group"][aria-roledescription="slide"]'
        )
        const isInteractive = target.matches(
          'button, a, input, textarea, select, [tabindex]:not([tabindex="-1"])'
        )
        if (isInSlide && isInteractive) return
      }

      const isHorizontal = direction === 'horizontal'
      const prevKey = isHorizontal ? 'ArrowLeft' : 'ArrowUp'
      const nextKey = isHorizontal ? 'ArrowRight' : 'ArrowDown'

      if (e.key === prevKey) {
        e.preventDefault()
        goToPrev()
      } else if (e.key === nextKey) {
        e.preventDefault()
        goToNext()
      } else if (e.key === 'Home') {
        e.preventDefault()
        goTo(0)
      } else if (e.key === 'End') {
        e.preventDefault()
        goTo(Math.max(0, slideCount - 1))
      }
    },
    [direction, goToPrev, goToNext, goTo, slideCount, onKeyDown]
  )

  return (
    <div
      ref={emblaRef as Ref<HTMLDivElement>}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-live={ariaLive}
      aria-label={labelId ? undefined : rootAriaLabel}
      aria-labelledby={labelId}
      className={cn(carouselContentVariants({ direction }), className)}
      {...props}
    >
      <div
        {...containerProps}
        className={cn(
          carouselContainerVariants({ direction }),
          containerProps?.className
        )}
      >
        {wrappedChildren}
      </div>
    </div>
  )
}

CarouselContent.displayName = 'Carousel.Content'

/* ─── Item ─── */

export type CarouselItemProps = ComponentProps<'div'>

export function CarouselItem({
  className,
  children,
  ...props
}: CarouselItemProps) {
  const { direction } = useCarouselContext()
  const { index, total, isInView } = useCarouselItem()
  return (
    <div
      role='group'
      aria-roledescription='slide'
      aria-label={`${index + 1} of ${total}`}
      tabIndex={-1}
      inert={!isInView}
      className={cn(carouselItemVariants({ direction }), className)}
      {...props}
    >
      {children}
    </div>
  )
}

CarouselItem.displayName = 'Carousel.Item'

/* ─── Previous / Next ─── */

export type CarouselNavButtonProps = Omit<
  IconButtonProps,
  'aria-label' | 'children'
> & {
  /**
   * Override the default accessible label.
   * Defaults to "Previous slide" / "Next slide" / "Pause carousel" / "Play carousel".
   */
  'aria-label'?: string
  /** Override the default caret/play/pause icon. */
  children?: ReactNode
}

export function CarouselPrevious({
  className,
  'aria-label': ariaLabel = 'Previous slide',
  children,
  ...props
}: CarouselNavButtonProps) {
  const { direction, slideCount, canGoToPrev, goToPrev } = useCarouselContext()
  if (slideCount <= 1) return null
  const Icon = direction === 'vertical' ? CaretUpIcon : CaretLeftIcon
  return (
    <IconButton
      size='icon-sm'
      className={className}
      aria-label={ariaLabel}
      aria-disabled={!canGoToPrev || undefined}
      disabled={!canGoToPrev}
      onClick={goToPrev}
      {...props}
    >
      {children ?? <Icon weight='bold' className='size-4' />}
    </IconButton>
  )
}

CarouselPrevious.displayName = 'Carousel.Previous'

export function CarouselNext({
  className,
  'aria-label': ariaLabel = 'Next slide',
  children,
  ...props
}: CarouselNavButtonProps) {
  const { direction, slideCount, canGoToNext, goToNext } = useCarouselContext()
  if (slideCount <= 1) return null
  const Icon = direction === 'vertical' ? CaretDownIcon : CaretRightIcon
  return (
    <IconButton
      size='icon-sm'
      className={className}
      aria-label={ariaLabel}
      aria-disabled={!canGoToNext || undefined}
      disabled={!canGoToNext}
      onClick={goToNext}
      {...props}
    >
      {children ?? <Icon weight='bold' className='size-4' />}
    </IconButton>
  )
}

CarouselNext.displayName = 'Carousel.Next'

/* ─── PlayPause ─── */

export function CarouselPlayPause({
  className,
  'aria-label': ariaLabel,
  children,
  ...props
}: CarouselNavButtonProps) {
  const { autoPlay, isPlaying, toggle } = useCarouselContext()
  if (autoPlay === false) return null
  const label = ariaLabel ?? (isPlaying ? 'Pause carousel' : 'Play carousel')
  return (
    <IconButton
      size='icon-sm'
      className={className}
      aria-label={label}
      aria-pressed={!isPlaying}
      onClick={toggle}
      {...props}
    >
      {children ??
        (isPlaying ? (
          <PauseIcon weight='bold' className='size-4 text-subtle' />
        ) : (
          <PlayIcon weight='bold' className='size-4 text-subtle' />
        ))}
    </IconButton>
  )
}

CarouselPlayPause.displayName = 'Carousel.PlayPause'

/* ─── Dots ─── */

export type CarouselDotsProps = ComponentProps<'div'>

export function CarouselDots({ className, ...props }: CarouselDotsProps) {
  const { direction, slideCount, selectedIndex, goTo } = useCarouselContext()
  if (slideCount <= 1) return null
  return (
    <div
      role='group'
      aria-label='Choose slide to display'
      className={cn(carouselDotsVariants({ direction }), className)}
      {...props}
    >
      {Array.from({ length: slideCount }, (_, index) => {
        const isActive = index === selectedIndex
        return (
          <button
            key={index}
            type='button'
            aria-label={`Go to slide ${index + 1}`}
            aria-current={isActive ? 'true' : undefined}
            aria-disabled={isActive || undefined}
            onClick={() => goTo(index)}
            className={cn(
              'is-interactive h-2 rounded-full transition-all',
              isActive
                ? 'w-5 emphasis-strong intent-accent'
                : 'w-2 emphasis-normal'
            )}
          />
        )
      })}
    </div>
  )
}

CarouselDots.displayName = 'Carousel.Dots'

/* ─── Compound attachment ─── */
//
// Direct property assignment (instead of Object.assign + cast) keeps the
// `Carousel` symbol a plain function declaration, which means
// `react-docgen-typescript` can extract the full CarouselProps interface
// for the docs site. TypeScript widens `typeof Carousel` automatically to
// include each attached subcomponent.

Carousel.Header = CarouselHeader
Carousel.Title = CarouselTitle
Carousel.TitleLink = CarouselTitleLink
Carousel.Content = CarouselContent
Carousel.Item = CarouselItem
Carousel.Previous = CarouselPrevious
Carousel.Next = CarouselNext
Carousel.PlayPause = CarouselPlayPause
Carousel.Dots = CarouselDots

export type CarouselVariantProps = VariantProps<typeof carouselContentVariants>
