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

// Padding plus a content-box background insets the visible circle while the
// whole square, the full height of the field, stays the touch target. Read
// only buttons are aria-disabled but not :disabled, so they need their own dim.
export const numberFieldStepperClasses =
  'grid aspect-square h-full shrink-0 place-items-center rounded-full border-transparent bg-clip-content p-1 is-interactive emphasis-subtler data-[readonly]:opacity-50'
