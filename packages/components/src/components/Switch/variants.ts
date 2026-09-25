import { cva } from 'class-variance-authority'

export const switchVariants = cva(
  [
    'group/track relative inline-flex shrink-0 cursor-pointer items-center rounded-full border border-subtle bg-[var(--intent-8)] p-px inset-shadow-sm',
    'transition-[background-color,border-color,outline-width,outline-color] duration-moderate',
    'outline-0 outline-offset-0 outline-[color-mix(in_oklch,var(--color-accent-9)_var(--focus-ring-opacity),transparent)] focus-visible:outline-[length:var(--focus-ring-width)]',
    'data-checked:border-transparent data-checked:bg-[var(--color-accent-9)]',
    'aria-invalid:border-[var(--color-danger-9)] aria-invalid:outline-[color-mix(in_oklch,var(--color-danger-9)_var(--focus-ring-opacity),transparent)] aria-invalid:data-checked:bg-[var(--color-danger-9)]',
    'data-disabled:cursor-not-allowed data-disabled:opacity-50',
    'data-readonly:cursor-default'
  ],
  {
    variants: {
      size: {
        sm: 'h-5 w-9 [--switch-thumb:--spacing(4)] [--switch-tick:--spacing(2.5)]',
        md: 'h-6 w-11 [--switch-thumb:--spacing(5)] [--switch-tick:--spacing(3)]'
      }
    },
    defaultVariants: {
      size: 'md'
    }
  }
)

// The thumb stays light in dark mode so it reads on the dark off track. Each
// size's track leaves exactly one thumb width of travel.
export const switchThumbVariants = cva(
  'pointer-events-none block size-(--switch-thumb) rounded-full bg-[var(--color-neutral-light-0)] shadow-sm transition-transform duration-moderate ease-out data-checked:translate-x-(--switch-thumb) rtl:data-checked:-translate-x-(--switch-thumb)'
)

// Fills the slot the thumb leaves when checked.
export const switchTickVariants = cva(
  'pointer-events-none absolute inset-y-0 start-px grid w-(--switch-thumb) place-items-center text-[var(--color-neutral-light-0)] opacity-0 scale-50 transition-[opacity,scale] duration-moderate ease-out group-data-checked/track:opacity-100 group-data-checked/track:scale-100'
)
