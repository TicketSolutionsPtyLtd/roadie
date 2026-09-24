import { cva } from 'class-variance-authority'

export type OTPFieldSize = 'sm' | 'md' | 'lg'
export type OTPFieldEmphasis = 'normal' | 'subtle'

// Slots grow to their size and shrink together when the row runs out of room.
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
        sm: 'max-w-10 text-lg',
        md: 'max-w-12 text-xl',
        lg: 'max-w-14 text-2xl'
      }
    },
    defaultVariants: {
      emphasis: 'normal',
      size: 'md'
    }
  }
)
