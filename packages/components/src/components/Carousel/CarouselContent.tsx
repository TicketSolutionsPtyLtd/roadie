'use client'

import {
  Children,
  type ComponentProps,
  type KeyboardEvent as ReactKeyboardEvent,
  type Ref,
  isValidElement,
  useCallback,
  useLayoutEffect,
  useMemo
} from 'react'

import { cn } from '@oztix/roadie-core/utils'

import {
  CarouselItemContext,
  type CarouselItemContextValue,
  useCarouselContext
} from './CarouselContext'
import {
  type CarouselContentOverflow,
  carouselContainerVariants,
  carouselContentVariants
} from './variants'

export type CarouselContentProps = ComponentProps<'div'> & {
  /** Props to forward to the inner Embla container (flex row/col). */
  containerProps?: ComponentProps<'div'>
  /**
   * How slides escape the viewport box.
   *
   * - `subtle` (default): slides bleed past the edges by the gutter width
   *   and fade to the page background via `::before` / `::after`
   *   gradients. Good for most carousels — gives a clear scroll hint
   *   without half-clipped cards.
   * - `hidden`: slides are hard-clipped at the viewport edge.
   * - `visible`: slides can extend indefinitely. Useful on wide screens
   *   where you deliberately want peeking slides to remain fully
   *   rendered in the surrounding margin area.
   *
   * @default 'subtle'
   */
  overflow?: CarouselContentOverflow
}

export function CarouselContent({
  className,
  children,
  containerProps,
  onKeyDown,
  overflow = 'subtle',
  ...props
}: CarouselContentProps) {
  const {
    direction,
    selectedIndex,
    snapCount,
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
      <CarouselItemContext key={child.key ?? index} value={itemContext}>
        {child}
      </CarouselItemContext>
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
        goTo(Math.max(0, snapCount - 1))
      }
    },
    [direction, goToPrev, goToNext, goTo, snapCount, onKeyDown]
  )

  return (
    <div
      ref={emblaRef as Ref<HTMLDivElement>}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-live={ariaLive}
      aria-label={labelId ? undefined : rootAriaLabel}
      aria-labelledby={labelId}
      data-slot='carousel-content'
      className={cn(
        carouselContentVariants({ direction, overflow }),
        className
      )}
      {...props}
    >
      <div
        {...containerProps}
        data-slot='carousel-container'
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
