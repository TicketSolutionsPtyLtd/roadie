import type { ReactNode } from 'react'

import { KbdShortcut } from '../Kbd/KbdShortcut'

export type MenuItemDecorations = {
  /** Pass a bold Phosphor icon; it is sized for you. */
  icon?: ReactNode
  /** Keys such as `['mod', 'd']`, shown per platform, or text such as `⌘D`. Visual only; bind the keys yourself. */
  shortcut?: ReactNode
}

export function itemContent({
  icon,
  shortcut,
  trailing,
  children
}: MenuItemDecorations & { trailing?: ReactNode; children: ReactNode }) {
  return (
    <>
      {icon ? (
        <span
          data-slot='menu-item-icon'
          aria-hidden='true'
          className='grid shrink-0 text-subtle [&>svg]:size-4'
        >
          {icon}
        </span>
      ) : null}
      <span data-slot='menu-item-label' className='min-w-0 flex-1 truncate'>
        {children}
      </span>
      {shortcut ? (
        // Hidden so the shortcut stays out of the item's accessible name.
        <KbdShortcut
          shortcut={shortcut}
          emphasis='subtler'
          data-slot='menu-item-shortcut'
          className='ms-4 shrink-0'
        />
      ) : null}
      {trailing}
    </>
  )
}
