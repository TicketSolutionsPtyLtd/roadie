'use client'

import { useCallback, useEffect, useRef } from 'react'

import { Steps as ArkSteps } from '@ark-ui/react/steps'

import { cn } from '@oztix/roadie-core/utils'

export type StepsItemProps = {
  index: number
  invalid?: boolean
  className?: string
  children?: React.ReactNode
}

type StepsItemInternalProps = StepsItemProps & {
  ref?: React.Ref<HTMLDivElement>
  onClick?: React.MouseEventHandler<HTMLDivElement>
}

export function StepsItem({ className, invalid, ...props }: StepsItemProps) {
  // Ark UI's types lose `index` in the HTMLProps intersection (upstream bug).
  // Cast is safe — index is required by the Zag.js state machine at runtime.
  const Item = ArkSteps.Item as React.ComponentType<
    Omit<StepsItemInternalProps, 'invalid'>
  >

  const itemRef = useRef<HTMLDivElement>(null)
  const prevInvalid = useRef(invalid)

  useEffect(() => {
    if (invalid && !prevInvalid.current) {
      const trigger = itemRef.current?.querySelector(
        '[data-part="trigger"]'
      ) as HTMLElement | null
      if (trigger) {
        trigger.classList.remove('animate-shake')
        void trigger.offsetWidth
        trigger.classList.add('animate-shake')
      }
    }
    prevInvalid.current = invalid
  }, [invalid])

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const trigger = (e.currentTarget as HTMLElement).querySelector(
      '[data-part="trigger"]'
    ) as HTMLElement | null
    if (!trigger) return
    const isLocked =
      trigger.getAttribute('tabindex') === '-1' &&
      trigger.hasAttribute('data-incomplete')
    if (!isLocked) return
    trigger.classList.remove('animate-shake')
    void trigger.offsetWidth
    trigger.classList.add('animate-shake')
  }, [])

  return (
    <Item
      ref={itemRef}
      data-slot='steps-item'
      className={cn(
        'group/step-item flex flex-1 items-center last:flex-none',
        'data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch',
        className
      )}
      data-invalid={invalid || undefined}
      onClick={handleClick}
      {...props}
    />
  )
}

StepsItem.displayName = 'Steps.Item'
