'use client'

import type { ComponentProps } from 'react'

import { useToastManager } from '@oztix/roadie-components/toast'

import { CopyChip } from './CopyChip'

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

/** A CopyChip that confirms in a toast, with the value and an optional colour swatch. */
export function CopyToastChip({
  swatch,
  ...props
}: Omit<ComponentProps<typeof CopyChip>, 'onCopy'> & {
  /** A CSS colour shown beside the value in the toast. */
  swatch?: string
}) {
  const toast = useToastManager()
  const description = <CopiedValue value={props.value} swatch={swatch} />

  return (
    <CopyChip
      {...props}
      onCopy={(copied) =>
        toast.add(
          copied
            ? { title: 'Copied', description }
            : { title: 'Couldn’t copy', description, intent: 'danger' }
        )
      }
    />
  )
}
