'use client'

import { MagnifyingGlassIcon } from '@phosphor-icons/react'

import { isDev } from '../../utils/isDev'
import { Button, type ButtonProps } from '../Button'
import { KbdShortcut } from '../Kbd/KbdShortcut'
import { useKeyPlatform } from '../Kbd/platform'
import { useRegisteredPalette } from './registry'
import { ariaKeyShortcuts } from './shortcut'

export type CommandPaletteTriggerProps = Omit<ButtonProps, 'href'>

/**
 * A button that opens the page's CommandPalette, the one that binds a
 * shortcut, and shows that shortcut. It sits anywhere on the page.
 */
export function CommandPaletteTrigger({
  children = 'Search',
  onClick,
  ...props
}: CommandPaletteTriggerProps) {
  const palette = useRegisteredPalette()
  const platform = useKeyPlatform()
  const shortcut = palette?.shortcut ?? null
  return (
    <Button
      data-slot='command-palette-trigger'
      aria-keyshortcuts={
        shortcut ? ariaKeyShortcuts(shortcut, platform) : undefined
      }
      onClick={(event) => {
        onClick?.(event)
        if (event.defaultPrevented) return
        if (palette) palette.open()
        else if (isDev())
          console.warn(
            '[Roadie] CommandPalette.Trigger found no CommandPalette with a shortcut to open.'
          )
      }}
      {...props}
    >
      <MagnifyingGlassIcon weight='bold' aria-hidden />
      {children}
      {shortcut ? (
        <KbdShortcut
          shortcut={shortcut}
          emphasis='subtler'
          data-slot='command-palette-trigger-shortcut'
          className='text-subtle'
        />
      ) : null}
    </Button>
  )
}

CommandPaletteTrigger.displayName = 'CommandPalette.Trigger'
