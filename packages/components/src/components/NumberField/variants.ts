import { cva } from 'class-variance-authority'

export type NumberFieldSize = 'sm' | 'md' | 'lg'
export type NumberFieldEmphasis = 'normal' | 'subtle'

export const numberFieldGroupVariants = cva(
  'flex w-full items-center rounded-lg font-sans text-base',
  {
    variants: {
      emphasis: {
        normal: 'emphasis-field is-interactive-field-group',
        subtle:
          'bg-subtle text-normal border border-transparent is-interactive-field-group'
      },
      size: {
        sm: 'h-8',
        md: 'h-10',
        lg: 'h-12'
      }
    },
    defaultVariants: {
      emphasis: 'normal',
      size: 'md'
    }
  }
)

// The transparent border insets the visible circle while the whole square,
// the full height of the field, stays the touch target.
export const numberFieldStepperClasses =
  'grid aspect-square h-full shrink-0 cursor-pointer place-items-center rounded-full border-4 border-transparent bg-clip-padding text-normal transition duration-moderate hover:bg-subtle hover:text-strong active:scale-90 aria-disabled:cursor-default aria-disabled:bg-transparent aria-disabled:text-subtler aria-disabled:active:scale-100'
