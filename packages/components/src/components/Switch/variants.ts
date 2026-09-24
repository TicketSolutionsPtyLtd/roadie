import { cva } from 'class-variance-authority'

export const switchVariants = cva(
  [
    'relative inline-flex shrink-0 cursor-pointer items-center rounded-full border border-normal p-px emphasis-sunken',
    'transition-[background-color,border-color,outline-width,outline-color] duration-moderate',
    'outline-0 outline-offset-0 outline-[color-mix(in_oklch,var(--color-accent-9)_var(--focus-ring-opacity),transparent)] focus-visible:outline-[length:var(--focus-ring-width)]',
    'data-checked:border-transparent data-checked:bg-[var(--intent-bg-strong)]',
    'aria-invalid:border-[var(--color-danger-9)] aria-invalid:outline-[color-mix(in_oklch,var(--color-danger-9)_var(--focus-ring-opacity),transparent)] aria-invalid:data-checked:bg-[var(--color-danger-9)]',
    'data-disabled:cursor-not-allowed data-disabled:opacity-50',
    'data-readonly:cursor-default'
  ],
  {
    variants: {
      intent: {
        neutral: 'data-checked:intent-neutral',
        brand: 'data-checked:intent-brand',
        'brand-secondary': 'data-checked:intent-brand-secondary',
        accent: 'data-checked:intent-accent',
        danger: 'data-checked:intent-danger',
        success: 'data-checked:intent-success',
        warning: 'data-checked:intent-warning',
        info: 'data-checked:intent-info'
      },
      size: {
        sm: 'h-5 w-9 [--switch-thumb:--spacing(4)]',
        md: 'h-6 w-11 [--switch-thumb:--spacing(5)]'
      }
    },
    compoundVariants: [
      { intent: undefined, className: 'data-checked:intent-accent' }
    ],
    defaultVariants: {
      size: 'md'
    }
  }
)

// The thumb stays light in dark mode so it reads on the dark off track. Each
// size's track leaves exactly one thumb width of travel.
export const switchThumbVariants = cva(
  'pointer-events-none block size-(--switch-thumb) rounded-full bg-[var(--color-neutral-light-0)] shadow-sm transition-transform duration-moderate ease-out motion-reduce:transition-none data-checked:translate-x-(--switch-thumb) rtl:data-checked:-translate-x-(--switch-thumb)'
)
