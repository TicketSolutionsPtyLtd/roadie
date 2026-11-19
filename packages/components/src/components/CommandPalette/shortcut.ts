import { normalise } from '../Kbd/keys'
import type { KeyPlatform } from '../Kbd/platform'

type Modifiers = { ctrl: boolean; meta: boolean; alt: boolean; shift: boolean }

// One printable character stays as it is: normalise would drop `-` and `_`.
const keyId = (key: string) =>
  /^\S$/.test(key) ? key.toLowerCase() : normalise(key)

function parse(keys: readonly string[], platform: KeyPlatform | null) {
  const modifiers: Modifiers = {
    ctrl: false,
    meta: false,
    alt: false,
    shift: false
  }
  let key = ''
  for (const part of keys) {
    const id = keyId(part)
    if (id === 'mod') modifiers[platform === 'apple' ? 'meta' : 'ctrl'] = true
    else if (id in modifiers) modifiers[id as keyof Modifiers] = true
    else key = id
  }
  return { modifiers, key }
}

export function matchesShortcut(
  event: KeyboardEvent,
  keys: readonly string[],
  platform: KeyPlatform | null
) {
  // Chrome's autofill sends a keydown with no key.
  if (typeof event.key !== 'string') return false
  const { modifiers, key } = parse(keys, platform)
  return (
    keyId(event.key) === key &&
    event.ctrlKey === modifiers.ctrl &&
    event.metaKey === modifiers.meta &&
    event.altKey === modifiers.alt &&
    event.shiftKey === modifiers.shift
  )
}

/** The shortcut as `aria-keyshortcuts` writes it, such as `Meta+K`. */
export function ariaKeyShortcuts(
  keys: readonly string[],
  platform: KeyPlatform | null
) {
  const { modifiers, key } = parse(keys, platform)
  const names = [
    modifiers.ctrl && 'Control',
    modifiers.meta && 'Meta',
    modifiers.alt && 'Alt',
    modifiers.shift && 'Shift',
    key.length === 1 ? key.toUpperCase() : key
  ]
  return names.filter(Boolean).join('+')
}
