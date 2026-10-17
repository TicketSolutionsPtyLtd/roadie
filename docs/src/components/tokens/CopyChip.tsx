'use client'

import type { ReactNode } from 'react'

import { CheckIcon, CopyIcon, WarningCircleIcon } from '@phosphor-icons/react'

import { cn } from '@oztix/roadie-core/utils'

import { useCopy } from '../useCopy'

export function CopyChip({
  value,
  children,
  nowrap = false,
  onCopy,
  className
}: {
  value: string
  children: ReactNode
  /** Keeps a value such as a token name on one line, rather than breaking it anywhere. */
  nowrap?: boolean
  /**
   * Reports each copy and whether it worked. The caller then owns the
   * confirmation, so the chip drops its own text and announcement.
   */
  onCopy?: (copied: boolean) => void
  className?: string
}) {
  const { copied, failed, copy } = useCopy()
  const Icon = copied ? CheckIcon : failed ? WarningCircleIcon : CopyIcon
  const confirmsInline = !onCopy

  return (
    <button
      type='button'
      onClick={async () => {
        const copied = await copy(value)
        onCopy?.(copied)
      }}
      aria-label={`Copy ${value}`}
      className={cn(
        'is-interactive inline-flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-0.5 text-start font-mono text-sm select-none hover:bg-subtle',
        className
      )}
    >
      <span className={nowrap ? 'whitespace-nowrap' : 'min-w-0 break-all'}>
        {children}
      </span>
      <Icon weight='bold' className='size-3 shrink-0 text-subtle' />
      {confirmsInline && failed && (
        <span className='font-sans text-xs whitespace-nowrap text-strong intent-danger'>
          Couldn&rsquo;t copy
        </span>
      )}
      {confirmsInline && (
        <span aria-live='polite' className='sr-only'>
          {copied ? `Copied ${value}` : failed ? `Couldn't copy ${value}` : ''}
        </span>
      )}
    </button>
  )
}
