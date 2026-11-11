'use client'

import type { ReactNode } from 'react'

import { CheckIcon, CopyIcon } from '@phosphor-icons/react'

import { cn } from '@oztix/roadie-core/utils'

import { useCopyToast } from '../useCopy'

function CopiedValue({ value, swatch }: { value: string; swatch?: string }) {
  return (
    <span className='flex min-w-0 items-center gap-2'>
      {swatch && (
        <span
          aria-hidden
          className='size-4 shrink-0 rounded-sm border border-subtler'
          // The swatch shows the colour itself, so it paints the value, not a themed utility.
          style={{ backgroundColor: swatch }}
        />
      )}
      <code className='font-mono break-all select-all'>{value}</code>
    </span>
  )
}

/** Copies a value, such as a token or component name, and confirms in a toast that shows it. */
export function CopyChip({
  value,
  children,
  nowrap = false,
  swatch,
  className
}: {
  value: string
  children: ReactNode
  /** Keeps a value such as a token name on one line, rather than breaking it anywhere. */
  nowrap?: boolean
  /** A CSS colour shown beside the value in the toast. */
  swatch?: string
  className?: string
}) {
  const { copied, copy } = useCopyToast()
  const Icon = copied ? CheckIcon : CopyIcon
  const description = <CopiedValue value={value} swatch={swatch} />

  return (
    <button
      type='button'
      onClick={() =>
        copy(value, { copied: 'Copied', failed: 'Couldn’t copy', description })
      }
      aria-label={`Copy ${value}`}
      className={cn(
        'is-interactive inline-flex min-w-0 items-center gap-1.5 rounded-md border-0 px-1.5 py-0.5 emphasis-subtler text-start font-mono text-sm select-none',
        className
      )}
    >
      <span className={nowrap ? 'whitespace-nowrap' : 'min-w-0 break-all'}>
        {children}
      </span>
      <Icon weight='bold' className='size-3 shrink-0 text-subtle' />
    </button>
  )
}
