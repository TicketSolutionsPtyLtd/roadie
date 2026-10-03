import { cva } from 'class-variance-authority'

// Dimmed in place, so the list keeps its shape while the preview moves.
export const sortableItemVariants = cva([
  'relative',
  'data-dragging:opacity-40 motion-safe:transition-opacity'
])

// Straddles the item's edge, so it sits in the seam between two items.
export const sortableDropIndicatorVariants = cva(
  [
    'pointer-events-none absolute z-10 rounded-full intent-accent bg-strong',
    'forced-color-adjust-none forced-colors:bg-[Highlight]'
  ],
  {
    variants: {
      edge: {
        top: 'inset-x-1 -top-px h-0.5',
        bottom: 'inset-x-1 -bottom-px h-0.5',
        left: 'inset-y-1 -left-px w-0.5',
        right: 'inset-y-1 -right-px w-0.5'
      }
    }
  }
)

// Follows its row's align-items, which btn's place-self: start would override.
export const sortableHandleVariants = cva(
  'cursor-grab self-auto active:cursor-grabbing'
)
