'use client'

import { type RefAttributes } from 'react'

import { Switch as SwitchPrimitive } from '@base-ui/react/switch'

import { cn } from '@oztix/roadie-core/utils'

import { switchThumbVariants } from './variants'

export type SwitchThumbProps = SwitchPrimitive.Thumb.Props &
  RefAttributes<HTMLSpanElement>

export function SwitchThumb({ className, ...props }: SwitchThumbProps) {
  return (
    <SwitchPrimitive.Thumb
      data-slot='switch-thumb'
      className={cn(switchThumbVariants(), className)}
      {...props}
    />
  )
}

SwitchThumb.displayName = 'Switch.Thumb'
