import type { ComponentProps, ReactNode } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { KbdShortcut } from '../Kbd/KbdShortcut'

export type CommandPaletteHintProps = ComponentProps<'span'> & {
  /** Keys such as `['escape']`, shown per platform, or text. */
  shortcut: ReactNode
}

/** A key reminder in `CommandPalette.Footer`: its label, then the keys. */
export function CommandPaletteHint({
  shortcut,
  className,
  children,
  ...props
}: CommandPaletteHintProps) {
  return (
    <span
      data-slot='command-palette-hint'
      className={cn('inline-flex items-center gap-2', className)}
      {...props}
    >
      {children}
      <KbdShortcut shortcut={shortcut} />
    </span>
  )
}

CommandPaletteHint.displayName = 'CommandPalette.Hint'
