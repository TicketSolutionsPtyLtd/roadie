import type { ComponentProps } from 'react'

import { type VariantProps, cva } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

import { intentVariants } from '../../variants'

export const codeVariants = cva(
  'font-mono rounded-md px-1.5 py-0.5 text-[0.9em]',
  {
    variants: {
      intent: intentVariants,
      emphasis: {
        normal: 'emphasis-normal',
        strong: 'emphasis-strong',
        subtle: 'emphasis-subtle',
        subtler: 'emphasis-subtler'
      }
    },
    defaultVariants: {
      emphasis: 'normal'
    }
  }
)

export interface CodeProps
  extends ComponentProps<'code'>,
    VariantProps<typeof codeVariants> {}

export function Code({ className, intent, emphasis, ...props }: CodeProps) {
  return (
    <code
      className={cn(codeVariants({ intent, emphasis, className }))}
      {...props}
    />
  )
}

Code.displayName = 'Code'
