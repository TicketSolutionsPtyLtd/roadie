import { cva } from 'class-variance-authority'

// Dimmed in place, so the list keeps its shape while the preview moves.
export const sortableItemVariants = cva(
  ['relative', 'data-dragging:opacity-40 motion-safe:transition-opacity'],
  {
    variants: {
      dragFrom: {
        handle: '',
        // The item's link overlay (data-interactive-target) covers the item
        // with its own pointer cursor, so it takes the item's cursor too. A
        // button or field inside keeps its own.
        item: [
          'not-data-disabled:cursor-grab not-data-disabled:data-dragging:cursor-grabbing',
          'not-data-disabled:[&_[data-interactive-target]]:cursor-[inherit]'
        ]
      }
    }
  }
)

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

export const sortableHandleVariants = cva('cursor-grab active:cursor-grabbing')

// Drawn on ::after, so the ring never shifts the layout and its intent never
// reaches the items inside.
export const sortableDropZoneVariants = cva([
  'relative after:pointer-events-none after:absolute after:-inset-1 after:rounded-2xl',
  'data-drop-target:after:border-2 data-drop-target:after:intent-accent data-drop-target:after:border-strong'
])
