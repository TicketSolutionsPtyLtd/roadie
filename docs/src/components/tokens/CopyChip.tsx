'use client'

import type { ReactNode } from 'react'

import { CheckIcon, CopyIcon } from '@phosphor-icons/react'

import { cn } from '@oztix/roadie-core/utils'

import { useCopy } from '../useCopy'

export function CopyChip({
  value,
  children,
  className
}: {
  value: string
  children: ReactNode
  className?: string
}) {
  const { copied, copy } = useCopy()
  const Icon = copied ? CheckIcon : CopyIcon

  return (
    <button
      type='button'
      onClick={() => copy(value)}
      aria-label={`Copy ${value}`}
      className={cn(
        'is-interactive inline-flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-0.5 text-start font-mono text-sm select-none hover:bg-subtle',
        className
      )}
    >
      <span className='min-w-0 break-all'>{children}</span>
      <Icon weight='bold' className='size-3 shrink-0 text-subtle' />
      <span aria-live='polite' className='sr-only'>
        {copied ? `Copied ${value}` : ''}
      </span>
    </button>
  )
}
