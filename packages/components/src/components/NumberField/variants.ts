import { cva } from 'class-variance-authority'

import { type RoadieIntent, intentVariants } from '../../variants'
import { buttonVariants } from '../Button/Button'

export type NumberFieldSize = 'sm' | 'md' | 'lg'
export type NumberFieldEmphasis = 'normal' | 'subtle' | 'subtler'
export type NumberFieldStepperEmphasis =
  'strong' | 'normal' | 'subtle' | 'subtler'

export const numberFieldGroupVariants = cva(
  'flex w-full items-center rounded-lg font-sans text-base',
  {
    variants: {
      emphasis: {
        normal: 'emphasis-field is-interactive-field-group',
        subtle:
          'bg-subtle text-normal border border-transparent is-interactive-field-group',
        subtler: 'gap-2 rounded-full'
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

// Inside the field, padding plus a content-box background insets the visible
// circle while the whole square, the full height of the field, stays the touch
// target. Read only buttons are aria-disabled but not :disabled, so they need
// their own dim.
const inFieldStepperVariants = cva(
  'grid aspect-square h-full shrink-0 place-items-center rounded-full border-transparent bg-clip-content p-1 is-interactive data-[readonly]:opacity-50',
  {
    variants: {
      emphasis: {
        strong: 'emphasis-strong',
        normal: 'emphasis-normal',
        subtle: 'emphasis-subtle',
        subtler: 'emphasis-subtler'
      },
      intent: intentVariants
    },
    defaultVariants: { emphasis: 'subtler' }
  }
)

const standaloneSizes = {
  sm: 'icon-sm',
  md: 'icon-md',
  lg: 'icon-lg'
} as const

export function numberFieldStepperClasses({
  fieldEmphasis,
  size = 'md',
  emphasis,
  intent
}: {
  fieldEmphasis?: NumberFieldEmphasis
  size?: NumberFieldSize
  emphasis?: NumberFieldStepperEmphasis
  intent?: RoadieIntent
}) {
  if (fieldEmphasis === 'subtler') {
    return `${buttonVariants({
      emphasis: emphasis ?? 'normal',
      intent,
      size: standaloneSizes[size]
    })} data-[readonly]:opacity-50`
  }
  return inFieldStepperVariants({ emphasis, intent })
}

export function stepperIconClass(size: NumberFieldSize = 'md') {
  return size === 'lg' ? 'size-5' : 'size-4'
}
