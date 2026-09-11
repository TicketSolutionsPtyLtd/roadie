// Subpath entry for `@oztix/roadie-components/scroll-area`.
// NO 'use client' — server-safe property-assignment layer.
// See docs/contributing/COMPOUND_PATTERNS.md.
import { ScrollAreaContent } from './ScrollAreaContent'
import { ScrollAreaCorner } from './ScrollAreaCorner'
import { ScrollAreaRoot } from './ScrollAreaRoot'
import { ScrollAreaScrollbar } from './ScrollAreaScrollbar'
import { ScrollAreaThumb } from './ScrollAreaThumb'
import { ScrollAreaViewport } from './ScrollAreaViewport'

const ScrollArea = ScrollAreaRoot as typeof ScrollAreaRoot & {
  Root: typeof ScrollAreaRoot
  Viewport: typeof ScrollAreaViewport
  Content: typeof ScrollAreaContent
  Scrollbar: typeof ScrollAreaScrollbar
  Thumb: typeof ScrollAreaThumb
  Corner: typeof ScrollAreaCorner
}

ScrollArea.Root = ScrollAreaRoot
ScrollArea.Viewport = ScrollAreaViewport
ScrollArea.Content = ScrollAreaContent
ScrollArea.Scrollbar = ScrollAreaScrollbar
ScrollArea.Thumb = ScrollAreaThumb
ScrollArea.Corner = ScrollAreaCorner

export { ScrollArea }
export type { ScrollAreaRootProps as ScrollAreaProps } from './ScrollAreaRoot'
export type { ScrollAreaViewportProps } from './ScrollAreaViewport'
export type { ScrollAreaContentProps } from './ScrollAreaContent'
export type { ScrollAreaScrollbarProps } from './ScrollAreaScrollbar'
export type { ScrollAreaThumbProps } from './ScrollAreaThumb'
export type { ScrollAreaCornerProps } from './ScrollAreaCorner'
export type { ScrollAreaScrollbarOrientation, ScrollAreaFade } from './variants'
export {
  scrollAreaRootVariants,
  scrollAreaViewportVariants,
  scrollAreaContentVariants,
  scrollAreaScrollbarVariants,
  scrollAreaThumbVariants,
  scrollAreaCornerVariants
} from './variants'
