'use client'

import { type RefAttributes } from 'react'

import { Switch as SwitchPrimitive } from '@base-ui/react/switch'

import { mergeClassName } from '../../utils/mergeClassName'
import { switchThumbVariants } from './variants'

export type SwitchThumbProps = SwitchPrimitive.Thumb.Props &
  RefAttributes<HTMLSpanElement>

export function SwitchThumb({ className, ...props }: SwitchThumbProps) {
  return (
    <SwitchPrimitive.Thumb
      data-slot='switch-thumb'
      className={mergeClassName(switchThumbVariants(), className)}
      {...props}
    />
  )
}

SwitchThumb.displayName = 'Switch.Thumb'
