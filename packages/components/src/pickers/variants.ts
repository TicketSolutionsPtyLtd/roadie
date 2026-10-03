import { cva } from 'class-variance-authority'

export const datePickerGroupVariants = cva(
  'flex w-full min-w-0 items-center gap-1 rounded-lg font-sans text-base',
  {
    variants: {
      emphasis: {
        normal: 'emphasis-field is-interactive-field-group',
        subtle:
          'bg-subtle text-normal border border-transparent is-interactive-field-group'
      },
      size: {
        sm: 'h-8 ps-1.5 pe-0.5',
        md: 'h-10 ps-2 pe-1',
        lg: 'h-12 ps-2 pe-1'
      }
    },
    defaultVariants: {
      emphasis: 'normal',
      size: 'md'
    }
  }
)

export const triggerSizes = { sm: 'xs', md: 'sm', lg: 'md' } as const
