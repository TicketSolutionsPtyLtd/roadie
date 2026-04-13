'use client'

import {
  Children,
  type ComponentProps,
  type ReactNode,
  cloneElement,
  createContext,
  isValidElement,
  use,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState
} from 'react'

import {
  CaretDownIcon,
  CaretLeftIcon,
  CaretRightIcon,
  CaretUpIcon
} from '@phosphor-icons/react/ssr'
import { type VariantProps, cva } from 'class-variance-authority'
import type {
  EmblaCarouselType,
  EmblaOptionsType,
  EmblaPluginType
} from 'embla-carousel'
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

/* ─── Types ─── */

type CarouselDirection = 'horizontal' | 'vertical'

export type CarouselActions = {
  goToPrev: () => void
  goToNext: () => void
  goTo: (index: number) => void
}

export type CarouselState = {
  direction: CarouselDirection
  selectedIndex: number
  slideCount: number
  canGoToPrev: boolean
  canGoToNext: boolean
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

export const carouselContentVariants = cva(
  'relative overflow-hidden focus-visible:outline-none',
  {
    variants: {
      direction: {
        horizontal: '',
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

export interface CarouselProps extends ComponentProps<'div'> {
  /** Pass-through options for the Embla instance. */
  opts?: EmblaOptionsType
  /** Scroll direction. @default 'horizontal' */
  direction?: CarouselDirection
  /** Accessible name for the carousel region. */
  'aria-label'?: string
}

function CarouselRoot({
  opts,
  direction = 'horizontal',
  children,
  className,
  'aria-label': ariaLabel,
  ...props
}: CarouselProps) {
  const axis: 'x' | 'y' = direction === 'vertical' ? 'y' : 'x'

  const plugins = useMemo<EmblaPluginType[]>(() => [], [])

  const resolvedOpts = useMemo<EmblaOptionsType>(
    () => ({
      ...opts,
      axis
    }),
    [opts, axis]
  )

  const [emblaRef, api] = useEmblaCarousel(resolvedOpts, plugins)

  // slideCount is authoritative from Carousel.Content's children (set via
  // the internal setter below). Boundary state is derived from slideCount +
  // selectedIndex + loop, not read from Embla — this works in jsdom where
  // Embla can't measure layout, and matches Embla's behaviour 1:1 in real
  // browsers for the default (1-snap-per-slide) case.
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [slideCount, setSlideCount] = useState(0)
  const [labelId] = useState<string | undefined>(undefined)

  const loop = opts?.loop === true

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

  // Re-init Embla when the slide count changes at runtime.
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

  // Optimistically update selectedIndex alongside api.goTo calls. Embla's
  // `select` event will also fire in real browsers and set the same value
  // (idempotent) — the optimistic write keeps state correct in jsdom where
  // Embla can't measure layout.
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
      }
    }),
    [api, loop, slideCount]
  )

  const state = useMemo<CarouselState>(
    () => ({
      direction,
      selectedIndex,
      slideCount,
      canGoToPrev,
      canGoToNext,
      labelId,
      rootAriaLabel: ariaLabel
    }),
    [
      direction,
      selectedIndex,
      slideCount,
      canGoToPrev,
      canGoToNext,
      labelId,
      ariaLabel
    ]
  )

  const refs = useMemo<CarouselRefs>(() => ({ api, emblaRef }), [api, emblaRef])

  const internal = useMemo<CarouselInternal>(
    () => ({ setSlideCount, loop }),
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

CarouselRoot.displayName = 'Carousel'

/* ─── Content ─── */

export interface CarouselContentProps extends ComponentProps<'div'> {
  /** Props to forward to the inner Embla container (flex row/col). */
  containerProps?: ComponentProps<'div'>
}

function CarouselContent({
  className,
  children,
  containerProps,
  ...props
}: CarouselContentProps) {
  const { direction, selectedIndex, slideCount } = useCarouselState()
  const { emblaRef } = useCarouselRefs()
  const { setSlideCount } = useCarouselInternal()

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

  return (
    <div
      ref={emblaRef as unknown as React.Ref<HTMLDivElement>}
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

function CarouselItem({ className, children, ...props }: CarouselItemProps) {
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

type NavButtonProps = Omit<IconButtonProps, 'aria-label' | 'children'> & {
  'aria-label'?: string
  children?: ReactNode
}

function CarouselPrevious({
  className,
  'aria-label': ariaLabel = 'Previous slide',
  children,
  ...props
}: NavButtonProps) {
  const { direction, slideCount, canGoToPrev } = useCarouselState()
  const { goToPrev } = useCarouselActions()
  if (slideCount <= 1) return null
  const Icon = direction === 'vertical' ? CaretUpIcon : CaretLeftIcon
  return (
    <IconButton
      emphasis='subtler'
      className={cn('rounded-full', className)}
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

function CarouselNext({
  className,
  'aria-label': ariaLabel = 'Next slide',
  children,
  ...props
}: NavButtonProps) {
  const { direction, slideCount, canGoToNext } = useCarouselState()
  const { goToNext } = useCarouselActions()
  if (slideCount <= 1) return null
  const Icon = direction === 'vertical' ? CaretDownIcon : CaretRightIcon
  return (
    <IconButton
      emphasis='subtler'
      className={cn('rounded-full', className)}
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

/* ─── Dots ─── */

export interface CarouselDotsProps extends ComponentProps<'div'> {}

function CarouselDots({ className, ...props }: CarouselDotsProps) {
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
              isActive ? 'bg-accent w-5' : 'w-2 bg-subtler hover:bg-subtle'
            )}
          />
        )
      })}
    </div>
  )
}

CarouselDots.displayName = 'Carousel.Dots'

/* ─── Compound export ─── */

export const Carousel = Object.assign(CarouselRoot, {
  Content: CarouselContent,
  Item: CarouselItem,
  Previous: CarouselPrevious,
  Next: CarouselNext,
  Dots: CarouselDots
}) as typeof CarouselRoot & {
  Content: typeof CarouselContent
  Item: typeof CarouselItem
  Previous: typeof CarouselPrevious
  Next: typeof CarouselNext
  Dots: typeof CarouselDots
}

export type CarouselVariantProps = VariantProps<typeof carouselContentVariants>
