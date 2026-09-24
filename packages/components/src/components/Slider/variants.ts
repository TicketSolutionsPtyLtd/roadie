import { cva } from 'class-variance-authority'

// Padding is half the thumb along the track, so thumbs stay inside at min and
// max, and makes up 44px across it. Base UI subtracts it, so values line up.
export const sliderControlVariants = cva(
  [
    'col-span-full flex touch-none items-center select-none',
    'data-[orientation=vertical]:h-40 data-[orientation=vertical]:w-11 data-[orientation=vertical]:justify-center',
    'data-disabled:cursor-not-allowed data-disabled:opacity-50'
  ],
  {
    variants: {
      size: {
        sm: 'px-2 py-3.5 data-[orientation=vertical]:px-3.5 data-[orientation=vertical]:py-2',
        md: 'px-2.5 py-3 data-[orientation=vertical]:px-3 data-[orientation=vertical]:py-2.5',
        lg: 'px-3 py-2.5 data-[orientation=vertical]:px-2.5 data-[orientation=vertical]:py-3'
      }
    },
    defaultVariants: { size: 'md' }
  }
)

export const sliderTrackVariants = cva(
  [
    'relative w-full rounded-full border border-normal intent-neutral emphasis-sunken',
    'data-[orientation=vertical]:h-full',
    'forced-colors:outline forced-colors:outline-1'
  ],
  {
    variants: {
      size: {
        sm: 'h-1 data-[orientation=vertical]:w-1',
        md: 'h-1.5 data-[orientation=vertical]:w-1.5',
        lg: 'h-2 data-[orientation=vertical]:w-2'
      }
    },
    defaultVariants: { size: 'md' }
  }
)

export const sliderThumbVariants = cva(
  [
    'relative rounded-full bg-[var(--color-neutral-light-0)] shadow-[var(--rim-light-strong),var(--shadow-md)] select-none',
    'before:absolute before:top-1/2 before:left-1/2 before:size-11 before:-translate-1/2 before:rounded-full',
    'transition-[outline-width,outline-color] duration-moderate',
    'outline-0 outline-offset-0 outline-[color-mix(in_oklch,var(--color-accent-9)_var(--focus-ring-opacity),transparent)] has-focus-visible:outline-[length:var(--focus-ring-width)]',
    'group-data-invalid/slider:outline-[color-mix(in_oklch,var(--color-danger-9)_var(--focus-ring-opacity),transparent)]',
    'data-disabled:cursor-not-allowed data-dragging:cursor-grabbing',
    'forced-colors:border forced-colors:border-[CanvasText]'
  ],
  {
    variants: {
      size: { sm: 'size-4', md: 'size-5', lg: 'size-6' }
    },
    defaultVariants: { size: 'md' }
  }
)
