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

// A layout that types another script, such as Russian, still has the Latin
// letter's physical key; a Latin layout keeps the letter it shows (Dvorak).
const keyMatches = (event: KeyboardEvent, key: string) =>
  keyId(event.key) === key ||
  (/^[a-z]$/.test(key) &&
    !/^[\x20-\x7e]$/.test(event.key) &&
    event.code === `Key${key.toUpperCase()}`)

export function matchesShortcut(
  event: KeyboardEvent,
  keys: readonly string[],
  platform: KeyPlatform | null
) {
  // Chrome's autofill sends a keydown with no key.
  if (typeof event.key !== 'string') return false
  const { modifiers, key } = parse(keys, platform)
  return (
    keyMatches(event, key) &&
    event.ctrlKey === modifiers.ctrl &&
    event.metaKey === modifiers.meta &&
    event.altKey === modifiers.alt &&
    event.shiftKey === modifiers.shift
  )
}

const ARIA_KEY_NAMES: Record<string, string> = {
  space: 'Space',
  enter: 'Enter',
  escape: 'Escape',
  tab: 'Tab',
  backspace: 'Backspace',
  delete: 'Delete',
  arrowup: 'ArrowUp',
  arrowdown: 'ArrowDown',
  arrowleft: 'ArrowLeft',
  arrowright: 'ArrowRight'
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
    ARIA_KEY_NAMES[key] ?? (key.length === 1 ? key.toUpperCase() : key)
  ]
  return names.filter(Boolean).join('+')
}
