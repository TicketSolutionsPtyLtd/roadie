import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

export type CommandPaletteFooterProps = ComponentProps<'div'>

/** A row of `CommandPalette.Hint`s under the list. A phone has no keys, so it hides there. */
export function CommandPaletteFooter({
  className,
  ...props
}: CommandPaletteFooterProps) {
  return (
    <div
      data-slot='command-palette-footer'
      className={cn(
        'flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-subtler px-4 py-3 text-sm text-subtle max-sm:hidden',
        className
      )}
      {...props}
    />
  )
}

CommandPaletteFooter.displayName = 'CommandPalette.Footer'
