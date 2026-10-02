import type { ReactNode } from 'react'

import { Kbd, type KbdProps } from '.'

const isKeyList = (shortcut: ReactNode): shortcut is readonly string[] =>
  Array.isArray(shortcut) && shortcut.every((key) => typeof key === 'string')

export const hasShortcut = (shortcut: ReactNode) =>
  isKeyList(shortcut) ? shortcut.length > 0 : Boolean(shortcut)

/** A component's `shortcut` prop: a key list becomes keycaps, anything else one Kbd. */
export function KbdShortcut({
  shortcut,
  ...props
}: Omit<KbdProps, 'keys' | 'children'> & { shortcut: ReactNode }) {
  return isKeyList(shortcut) ? (
    <Kbd keys={shortcut} {...props} />
  ) : (
    <Kbd {...props}>{shortcut}</Kbd>
  )
}
