import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

export type DialogBodyProps = ComponentProps<'div'>

export function DialogBody({ className, ...props }: DialogBodyProps) {
  return (
    <div
      data-slot='dialog-body'
      className={cn('grid gap-3', className)}
      {...props}
    />
  )
}

DialogBody.displayName = 'Dialog.Body'
