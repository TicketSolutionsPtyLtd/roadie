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
        subtler: 'gap-2 rounded-lg px-1.5 py-1 emphasis-subtler is-interactive',
        normal:
          'justify-between gap-3 rounded-xl p-4 emphasis-normal is-interactive has-[:checked]:bg-[var(--color-accent-2)] has-[:checked]:border-[var(--color-accent-9)] has-[:focus-visible]:outline has-[:focus-visible]:outline-[length:var(--focus-ring-width)] has-[:focus-visible]:outline-[color-mix(in_oklch,var(--color-accent-9)_var(--focus-ring-opacity),transparent)] has-[:focus-visible]:outline-offset-0'
      }
    },
    defaultVariants: {
      emphasis: 'subtler'
    }
  }
)
