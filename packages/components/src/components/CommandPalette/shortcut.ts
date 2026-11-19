import type { KeyPlatform } from '../Kbd/platform'

type Modifiers = { ctrl: boolean; meta: boolean; alt: boolean; shift: boolean }

const MODIFIER_OF: Record<string, keyof Modifiers | 'mod'> = {
  mod: 'mod',
  cmd: 'mod',
  command: 'mod',
  ctrl: 'ctrl',
  control: 'ctrl',
  meta: 'meta',
  alt: 'alt',
  option: 'alt',
  shift: 'shift'
}

function parse(keys: readonly string[], platform: KeyPlatform | null) {
  const modifiers: Modifiers = {
    ctrl: false,
    meta: false,
    alt: false,
    shift: false
  }
  let key = ''
  for (const part of keys) {
    const modifier = MODIFIER_OF[part.toLowerCase()]
    if (modifier === 'mod')
      modifiers[platform === 'apple' ? 'meta' : 'ctrl'] = true
    else if (modifier) modifiers[modifier] = true
    else key = part.toLowerCase()
  }
  return { modifiers, key }
}

export function matchesShortcut(
  event: KeyboardEvent,
  keys: readonly string[],
  platform: KeyPlatform | null
) {
  const { modifiers, key } = parse(keys, platform)
  return (
    event.key.toLowerCase() === key &&
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
