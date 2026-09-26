import { cva } from 'class-variance-authority'

// The box is as thick as the thumb, with half a thumb of padding along the
// track so thumbs stay inside at min and max (Base UI subtracts it). The
// before: band takes presses 44px across without taking layout space.
export const sliderControlVariants = cva(
  [
    'relative col-span-full flex touch-none items-center select-none',
    'before:absolute before:inset-x-0 before:top-1/2 before:h-11 before:-translate-y-1/2',
    'data-[orientation=vertical]:h-40 data-[orientation=vertical]:justify-center',
    'data-[orientation=vertical]:before:inset-x-auto data-[orientation=vertical]:before:inset-y-0 data-[orientation=vertical]:before:top-0 data-[orientation=vertical]:before:left-1/2 data-[orientation=vertical]:before:h-auto data-[orientation=vertical]:before:w-11 data-[orientation=vertical]:before:translate-x-[-50%] data-[orientation=vertical]:before:translate-y-0',
    'data-disabled:cursor-not-allowed data-disabled:opacity-50'
  ],
  {
    variants: {
      size: {
        sm: 'h-4 px-2 data-[orientation=vertical]:h-40 data-[orientation=vertical]:w-4 data-[orientation=vertical]:px-0 data-[orientation=vertical]:py-2',
        md: 'h-5 px-2.5 data-[orientation=vertical]:h-40 data-[orientation=vertical]:w-5 data-[orientation=vertical]:px-0 data-[orientation=vertical]:py-2.5',
        lg: 'h-6 px-3 data-[orientation=vertical]:h-40 data-[orientation=vertical]:w-6 data-[orientation=vertical]:px-0 data-[orientation=vertical]:py-3'
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
