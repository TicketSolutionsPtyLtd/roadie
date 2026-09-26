import { cva } from 'class-variance-authority'

export type OTPFieldSize = 'sm' | 'md' | 'lg'
export type OTPFieldEmphasis = 'normal' | 'subtle'

// max-w, not w, so a narrow row shrinks every slot instead of overflowing.
export const otpFieldInputVariants = cva(
  'aspect-square w-full min-w-0 flex-1 rounded-lg p-0 text-center font-sans font-medium tabular-nums',
  {
    variants: {
      emphasis: {
        normal: 'emphasis-field is-interactive-field',
        subtle:
          'bg-subtle text-normal border border-transparent is-interactive-field'
      },
      size: {
        sm: 'max-w-8 text-base',
        md: 'max-w-10 text-lg',
        lg: 'max-w-12 text-xl'
      }
    },
    defaultVariants: {
      emphasis: 'normal',
      size: 'md'
    }
  }
)
