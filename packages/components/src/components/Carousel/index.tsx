'use client'

import {
  Children,
  type ComponentProps,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  cloneElement,
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
  // Initial render (SSR + first client render) always sees `false` so
  // the server and client markup match. The real value is applied on the
  // first client effect tick, and Embla re-inits if it flips.
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
  hasAutoPlay: boolean
  userPaused: boolean
  labelId: string | undefined
  rootAriaLabel: string | undefined
}

export type CarouselRefs = {
  api: EmblaCarouselType | undefined
  emblaRef: (node: HTMLElement | null) => void
}

export type UseCarouselReturn = {
  state: CarouselState
  actions: CarouselActions
  api: EmblaCarouselType | undefined
}

/* ─── Contexts ─── */

const CarouselActionsContext = createContext<CarouselActions | null>(null)
const CarouselStateContext = createContext<CarouselState | null>(null)
const CarouselRefsContext = createContext<CarouselRefs | null>(null)

type CarouselInternal = {
  setSlideCount: (count: number) => void
  setLabelId: (id: string | undefined) => void
  loop: boolean
}

const CarouselInternalContext = createContext<CarouselInternal | null>(null)

type CarouselItemContextValue = {
  index: number
  total: number
  isActive: boolean
}

const CarouselItemContext = createContext<CarouselItemContextValue | null>(null)

function useCarouselActions(): CarouselActions {
  const ctx = use(CarouselActionsContext)
  if (!ctx)
    throw new Error('Carousel subcomponent must be used inside <Carousel>')
  return ctx
}

function useCarouselState(): CarouselState {
  const ctx = use(CarouselStateContext)
  if (!ctx)
    throw new Error('Carousel subcomponent must be used inside <Carousel>')
  return ctx
}

function useCarouselRefs(): CarouselRefs {
  const ctx = use(CarouselRefsContext)
  if (!ctx)
    throw new Error('Carousel subcomponent must be used inside <Carousel>')
  return ctx
}

function useCarouselInternal(): CarouselInternal {
  const ctx = use(CarouselInternalContext)
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
 * Access the carousel's state, actions, and underlying Embla API.
 * Must be called inside a <Carousel> tree.
 */
export function useCarousel(): UseCarouselReturn {
  const state = useCarouselState()
  const actions = useCarouselActions()
  const { api } = useCarouselRefs()
  return { state, actions, api }
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
        horizontal: '-my-2 py-2',
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

  // Dev warnings
  if (isDevEnvironment()) {
    if (autoPlay !== false && autoPlay < 2000) {
      console.warn(
        '[Carousel] autoPlay delay < 2000ms may fail WCAG 2.2.1 timing; prefer >= 4000ms.'
      )
    }
    if (opts?.axis && opts.axis !== axis) {
      console.warn(
        `[Carousel] opts.axis="${opts.axis}" conflicts with direction="${direction}". direction wins.`
      )
    }
  }

  const hasAutoPlay = autoPlay !== false

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

  // slideCount is authoritative from Carousel.Content's children.
  // See the Phase 2 commit for the rationale — short version: Embla's
  // snapList() is empty in jsdom, and for the default 1-snap-per-slide
  // case slideCount === children.length holds 1:1 with real browsers.
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [slideCount, setSlideCount] = useState(0)
  const [labelId, setLabelId] = useState<string | undefined>(undefined)

  // isPlaying + userPaused are React state (not refs) — the race review
  // flagged ref reads inside effects as vulnerable to tearing against the
  // snapshot that triggered the render. isPlaying initialises to whether
  // autoplay is configured *and* not blocked by reduced motion. Roadie
  // owns this state; Embla's autoplay:play/autoplay:stop events sync it
  // back when they fire in real browsers.
  const [isPlaying, setIsPlaying] = useState(
    () => hasAutoPlay && !prefersReducedMotion
  )
  const [userPaused, setUserPaused] = useState(false)
  const userPausedRef = useRef(false)
  useEffect(() => {
    userPausedRef.current = userPaused
  }, [userPaused])

  const loop = opts?.loop === true

  // ── Embla state sync ──
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

  // ── Focus drop guard ──
  // When a select event fires (slide changes), if focus was inside the
  // previous slide (which is about to become inert), move focus to the new
  // slide's wrapper so it doesn't drop to <body>.
  useEffect(() => {
    if (!api) return
    const handleSelect = (emblaApi: EmblaCarouselType) => {
      if (typeof document === 'undefined') return
      const activeEl = document.activeElement as HTMLElement | null
      if (!activeEl || !activeEl.isConnected) return
      const prevSlide = activeEl.closest('[aria-roledescription="slide"]')
      if (prevSlide && activeEl !== prevSlide) {
        const newSlide = emblaApi.slideNodes()[emblaApi.selectedSnap()]
        newSlide?.focus({ preventScroll: true })
      }
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
    // No cleanup that calls plugin.stop() — the action handlers below own
    // start/stop transitions, and the plugin's own destroy lifecycle (when
    // Embla unmounts) handles teardown.
  }, [api, plugins])

  // Reset isPlaying when autoplay configuration changes.
  useEffect(() => {
    setIsPlaying(hasAutoPlay && !prefersReducedMotion)
    if (!hasAutoPlay || prefersReducedMotion) {
      setUserPaused(false)
    }
  }, [hasAutoPlay, prefersReducedMotion])

  // ── Re-init on slide count change ──
  useEffect(() => {
    api?.reInit()
  }, [api, slideCount])

  // Clamp selectedIndex if children shrink below it.
  useEffect(() => {
    if (slideCount > 0 && selectedIndex >= slideCount) {
      setSelectedIndex(slideCount - 1)
    }
  }, [slideCount, selectedIndex])

  const canGoToPrev = slideCount > 1 && (loop || selectedIndex > 0)
  const canGoToNext = slideCount > 1 && (loop || selectedIndex < slideCount - 1)

  // ── Actions ──
  // play/pause/toggle drive React state directly and call the plugin
  // defensively. Roadie's React state is the source of truth — Embla's
  // autoplay events are a real-browser confirmation layer.
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
        setUserPaused(false)
        setIsPlaying(true)
        const plugin = api?.plugins().autoplay
        if (plugin) safePluginCall(plugin.play)
      },
      pause: () => {
        if (!hasAutoPlay) return
        setUserPaused(true)
        setIsPlaying(false)
        const plugin = api?.plugins().autoplay
        if (plugin) safePluginCall(plugin.stop)
      },
      toggle: () => {
        if (!hasAutoPlay) return
        setIsPlaying((current) => {
          const next = !current
          setUserPaused(!next)
          const plugin = api?.plugins().autoplay
          if (plugin) {
            safePluginCall(next ? plugin.play : plugin.stop)
          }
          return next
        })
      }
    }),
    [api, loop, slideCount, hasAutoPlay]
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
    (e: React.FocusEvent<HTMLDivElement>) => {
      if (userPausedRef.current) return
      const related = e.relatedTarget as Node | null
      const currentTarget = e.currentTarget
      const resume = () => {
        const plugin = api?.plugins().autoplay
        if (plugin) safePluginCall(plugin.play)
      }
      // Safari quirk: relatedTarget can be null for some blur events. Defer
      // one RAF and re-read document.activeElement instead of trusting the
      // synthetic event payload.
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

  const state = useMemo<CarouselState>(
    () => ({
      direction,
      selectedIndex,
      slideCount,
      canGoToPrev,
      canGoToNext,
      isPlaying,
      hasAutoPlay,
      userPaused,
      labelId,
      rootAriaLabel: ariaLabel
    }),
    [
      direction,
      selectedIndex,
      slideCount,
      canGoToPrev,
      canGoToNext,
      isPlaying,
      hasAutoPlay,
      userPaused,
      labelId,
      ariaLabel
    ]
  )

  const refs = useMemo<CarouselRefs>(() => ({ api, emblaRef }), [api, emblaRef])

  const internal = useMemo<CarouselInternal>(
    () => ({ setSlideCount, setLabelId, loop }),
    [loop]
  )

  return (
    <CarouselActionsContext.Provider value={actions}>
      <CarouselStateContext.Provider value={state}>
        <CarouselRefsContext.Provider value={refs}>
          <CarouselInternalContext.Provider value={internal}>
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
          </CarouselInternalContext.Provider>
        </CarouselRefsContext.Provider>
      </CarouselStateContext.Provider>
    </CarouselActionsContext.Provider>
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

export interface CarouselTitleProps extends ComponentProps<'h2'> {
  /**
   * When set, the title renders as an `<a>` with a trailing arrow icon
   * instead of an `<h2>`.
   */
  href?: string
}

export function CarouselTitle({
  className,
  children,
  href,
  id,
  ...props
}: CarouselTitleProps) {
  const generatedId = useId()
  const titleId = id ?? generatedId
  const { setLabelId } = useCarouselInternal()

  useEffect(() => {
    setLabelId(titleId)
    return () => setLabelId(undefined)
  }, [titleId, setLabelId])

  if (href) {
    return (
      <a
        id={titleId}
        href={href}
        className={cn(
          'group/title is-interactive flex items-center gap-1 text-display-ui-5 text-strong',
          className
        )}
      >
        {children}
        <ArrowRightIcon
          weight='bold'
          className='size-5 text-subtle transition-transform group-hover/title:translate-x-1 group-hover/title:intent-accent'
        />
      </a>
    )
  }

  return (
    <h2
      id={titleId}
      className={cn('text-display-ui-6 text-strong', className)}
      {...props}
    >
      {children}
    </h2>
  )
}

CarouselTitle.displayName = 'Carousel.Title'

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
    hasAutoPlay,
    userPaused,
    labelId,
    rootAriaLabel
  } = useCarouselState()
  const { goToPrev, goToNext, goTo } = useCarouselActions()
  const { emblaRef } = useCarouselRefs()
  const { setSlideCount } = useCarouselInternal()

  // aria-live is set once based on hasAutoPlay, and only flips on explicit
  // user pause — transient hover/focus pauses don't retrigger announcements.
  const ariaLive: 'off' | 'polite' =
    hasAutoPlay && !userPaused ? 'off' : 'polite'

  // Authoritative slide count comes from Carousel.Content's own children.
  // useLayoutEffect ensures the count is set before paint so the first
  // render of Dots / Previous / Next sees the correct value.
  const childCount = Children.count(children)
  useLayoutEffect(() => {
    setSlideCount(childCount)
  }, [childCount, setSlideCount])

  if (isDevEnvironment()) {
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
  }

  // Inject per-item context so each <Carousel.Item> can read its index /
  // total without lifting state.
  const wrappedChildren = Children.map(children, (child, index) => {
    if (!isValidElement(child)) return child
    const itemContext: CarouselItemContextValue = {
      index,
      total: slideCount || Children.count(children),
      isActive: index === selectedIndex
    }
    return (
      <CarouselItemContext.Provider value={itemContext}>
        {cloneElement(child)}
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
      ref={emblaRef as unknown as React.Ref<HTMLDivElement>}
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
  const { direction } = useCarouselState()
  const { index, total, isActive } = useCarouselItem()
  return (
    <div
      role='group'
      aria-roledescription='slide'
      aria-label={`${index + 1} of ${total}`}
      tabIndex={-1}
      inert={!isActive}
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
  const { direction, slideCount, canGoToPrev } = useCarouselState()
  const { goToPrev } = useCarouselActions()
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
  const { direction, slideCount, canGoToNext } = useCarouselState()
  const { goToNext } = useCarouselActions()
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
  const { hasAutoPlay, isPlaying } = useCarouselState()
  const { toggle } = useCarouselActions()
  if (!hasAutoPlay) return null
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

export interface CarouselDotsProps extends ComponentProps<'div'> {}

export function CarouselDots({ className, ...props }: CarouselDotsProps) {
  const { direction, slideCount, selectedIndex } = useCarouselState()
  const { goTo } = useCarouselActions()
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
Carousel.Content = CarouselContent
Carousel.Item = CarouselItem
Carousel.Previous = CarouselPrevious
Carousel.Next = CarouselNext
Carousel.PlayPause = CarouselPlayPause
Carousel.Dots = CarouselDots

export type CarouselVariantProps = VariantProps<typeof carouselContentVariants>
