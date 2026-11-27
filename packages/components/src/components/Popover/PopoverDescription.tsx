'use client'

import type { RefAttributes } from 'react'

import { Popover as PopoverPrimitive } from '@base-ui/react/popover'

import { mergeClassName } from '../../utils/mergeClassName'

export type PopoverDescriptionProps = PopoverPrimitive.Description.Props &
  RefAttributes<HTMLParagraphElement>

export function PopoverDescription({
  className,
  ...props
}: PopoverDescriptionProps) {
  return (
    <PopoverPrimitive.Description
      data-slot='popover-description'
      className={mergeClassName('text-sm text-subtle', className)}
      {...props}
    />
  )
}

PopoverDescription.displayName = 'Popover.Description'
