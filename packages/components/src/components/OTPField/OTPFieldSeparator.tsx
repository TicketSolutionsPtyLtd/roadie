'use client'

import type { RefAttributes } from 'react'

import { OTPField as OTPFieldPrimitive } from '@base-ui/react/otp-field'

import { mergeClassName } from '../../utils/mergeClassName'

export type OTPFieldSeparatorProps = OTPFieldPrimitive.Separator.Props &
  RefAttributes<HTMLDivElement>

export function OTPFieldSeparator({
  className,
  ...props
}: OTPFieldSeparatorProps) {
  return (
    <OTPFieldPrimitive.Separator
      data-slot='otp-field-separator'
      className={mergeClassName(
        'h-0.5 w-3 shrink-0 rounded-full bg-current text-subtler',
        className
      )}
      {...props}
    />
  )
}

OTPFieldSeparator.displayName = 'OTPField.Separator'
