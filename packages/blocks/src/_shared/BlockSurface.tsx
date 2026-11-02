import type { ReactNode } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { type SurfaceEmphasis, emphasisClass } from './surface'

export type BlockSurfaceProps = {
  /** The surface behind the content. Without one, the content sits on the page. */
  emphasis?: SurfaceEmphasis
  /** Keeps the surface inside the page's padding as a panel, rounded at every width, instead of a band. */
  contained?: boolean
  /** The content's measure. */
  width?: BlockWidth
  /** Drawn behind the content, filling the surface, such as a faint photo. Pads the content as a surface does. */
  backdrop?: ReactNode
  /** The content's own classes, such as its grid and gap. */
  className?: string
  children?: ReactNode
}

export type BlockWidth = '3xl' | '4xl' | '8xl'

// Literal class names, so Tailwind finds them. Padding follows the block's own width, not the screen's.
/** Sets the page's gutter, for content that runs edge to edge outside a frame but lines its controls up with the page. */
export const PAGE_GUTTER =
  '[--block-gutter:--spacing(6)] @3xl:[--block-gutter:--spacing(8)] @5xl:[--block-gutter:--spacing(12)]'
const PAGE_PADDING = `px-(--block-gutter) ${PAGE_GUTTER}`
const PANEL_PADDING =
  'px-(--block-gutter) py-8 [--block-gutter:--spacing(6)] @3xl:py-12 @3xl:[--block-gutter:--spacing(10)]'

/** Runs a child to the surface's edges, past the padding the frame gives its content, such as a marquee. */
export const BLEED = '-mx-(--block-gutter)'
const MEASURE: Record<BlockWidth, string> = {
  '3xl': 'mx-auto w-full max-w-3xl',
  '4xl': 'mx-auto w-full max-w-4xl',
  '8xl': 'mx-auto w-full max-w-8xl'
}

/** The frame every block draws its content in: on the page, on a full-width band, or on a contained panel. */
export function BlockSurface({
  emphasis,
  contained = false,
  width = '8xl',
  backdrop,
  className,
  children
}: BlockSurfaceProps) {
  const drawn = emphasis != null || backdrop != null
  if (!drawn) {
    return (
      <div className={cn(MEASURE[width], PAGE_PADDING, className)}>
        {children}
      </div>
    )
  }
  if (contained) {
    return (
      <div className={cn(MEASURE['8xl'], PAGE_PADDING)}>
        <div
          data-slot='block-surface'
          data-shape='panel'
          className={cn(
            'relative isolate grid rounded-3xl',
            PANEL_PADDING,
            backdrop && 'overflow-clip',
            emphasisClass(emphasis)
          )}
        >
          {backdrop}
          <div className={cn(MEASURE[width], className)}>{children}</div>
        </div>
      </div>
    )
  }
  return (
    <div className='@7xl:px-2'>
      <div
        data-slot='block-surface'
        data-shape='band'
        className={cn(
          'relative isolate mx-auto grid w-full max-w-8xl py-12 @xl:py-16 @5xl:py-20 @7xl:rounded-3xl',
          backdrop && 'overflow-clip',
          emphasisClass(emphasis)
        )}
      >
        {backdrop}
        <div className={cn(MEASURE[width], PAGE_PADDING, className)}>
          {children}
        </div>
      </div>
    </div>
  )
}
