import { cva } from 'class-variance-authority'

export const radioGroupVariants = cva('flex flex-wrap', {
  variants: {
    direction: {
      vertical: 'flex-col gap-2',
      horizontal: 'flex-row gap-4'
    }
  },
  defaultVariants: {
    direction: 'vertical'
  }
})

export const radioGroupItemVariants = cva(
  'flex cursor-pointer select-none items-center',
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

export type RadioGroupSize = 'sm' | 'md' | 'lg'

export const radioGroupItemSizes = {
  sm: { circle: 'size-4', dot: 'size-2', label: 'text-sm' },
  md: { circle: 'size-5', dot: 'size-2.5', label: 'text-sm' },
  lg: { circle: 'size-6', dot: 'size-3', label: 'text-base' }
} satisfies Record<
  RadioGroupSize,
  { circle: string; dot: string; label: string }
>

export const radioGroupItemTrailingClassName =
  'ms-auto shrink-0 text-sm text-subtle tabular-nums'
