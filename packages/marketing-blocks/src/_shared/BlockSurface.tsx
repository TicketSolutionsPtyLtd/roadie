import type { ReactNode } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { type SurfaceEmphasis, emphasisClass } from './surface'

export type BlockSurfaceProps = {
  /** The surface behind the content. Without one, the content sits on the page. */
  emphasis?: SurfaceEmphasis
  /** Keeps the surface inside the page's padding as a panel, rounded at every width, instead of a band. */
  inset?: boolean
  /** The content's measure. */
  width?: BlockWidth
  /** Drawn behind the content, filling the surface, such as a faint photo. Pads the content as a surface does. */
  backdrop?: ReactNode
  /** The content's own classes, such as its grid and gap. */
  className?: string
  children?: ReactNode
}

export type BlockWidth = '3xl' | '4xl' | '8xl'

// Literal class names, so Tailwind finds them.
const CONTAINER: Record<BlockWidth, string> = {
  '3xl': 'container-3xl',
  '4xl': 'container-4xl',
  '8xl': 'container-8xl'
}
const MEASURE: Record<BlockWidth, string> = {
  '3xl': 'mx-auto w-full max-w-3xl',
  '4xl': 'mx-auto w-full max-w-4xl',
  '8xl': 'w-full'
}

/** The frame every block draws its content in: on the page, on a full-width band, or on an inset panel. */
export function BlockSurface({
  emphasis,
  inset = false,
  width = '8xl',
  backdrop,
  className,
  children
}: BlockSurfaceProps) {
  const drawn = emphasis != null || backdrop != null
  if (!drawn) {
    return <div className={cn(CONTAINER[width], className)}>{children}</div>
  }
  if (inset) {
    return (
      <div className='container-8xl'>
        <div
          data-slot='block-surface'
          data-shape='panel'
          className={cn(
            'relative isolate grid overflow-clip rounded-3xl px-6 py-8 @3xl:px-10 @3xl:py-12',
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
          'relative isolate mx-auto grid w-full max-w-8xl overflow-clip py-12 @xl:py-16 @5xl:py-20 @7xl:rounded-3xl',
          emphasisClass(emphasis)
        )}
      >
        {backdrop}
        <div className={cn(CONTAINER[width], className)}>{children}</div>
      </div>
    </div>
  )
}
