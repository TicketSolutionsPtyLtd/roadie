import { cva } from 'class-variance-authority'

export const checkboxVariants = cva(
  'flex cursor-pointer select-none items-center has-[[data-disabled]]:pointer-events-none has-[[data-disabled]]:opacity-50',
  {
    variants: {
      emphasis: {
        subtler: 'gap-2 rounded-lg px-1.5 emphasis-subtler is-interactive',
        normal:
          'justify-between gap-3 rounded-xl p-4 emphasis-normal is-interactive has-[:checked]:bg-[var(--color-accent-2)] has-[:checked]:border-[var(--color-accent-9)] has-[:focus-visible]:outline has-[:focus-visible]:outline-[length:var(--focus-ring-width)] has-[:focus-visible]:outline-[color-mix(in_oklch,var(--color-accent-9)_var(--focus-ring-opacity),transparent)] has-[:focus-visible]:outline-offset-0'
      },
      size: {
        sm: '',
        md: '',
        lg: ''
      }
    },
    compoundVariants: [
      { emphasis: 'subtler', size: 'sm', className: 'py-0.5' },
      { emphasis: 'subtler', size: ['md', 'lg'], className: 'py-1' }
    ],
    defaultVariants: {
      emphasis: 'subtler',
      size: 'md'
    }
  }
)

export type CheckboxSize = 'sm' | 'md' | 'lg'

export const checkboxSizes = {
  sm: { box: 'size-4', icon: 'size-3.5', label: 'text-sm' },
  md: { box: 'size-5', icon: 'size-4.5', label: 'text-sm' },
  lg: { box: 'size-6', icon: 'size-5.5', label: 'text-base' }
} satisfies Record<CheckboxSize, { box: string; icon: string; label: string }>

export const checkboxTrailingClassName =
  'ms-auto shrink-0 text-sm text-subtle tabular-nums'
