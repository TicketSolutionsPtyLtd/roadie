import type { Icon } from '@phosphor-icons/react'
import {
  ArrowDownIcon,
  ArrowFatUpIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  BackspaceIcon,
  CommandIcon,
  ControlIcon,
  KeyReturnIcon,
  OptionIcon
} from '@phosphor-icons/react/ssr'

import type { KeyPlatform } from './platform'

export type KeyFace = {
  glyph?: Icon
  label?: string
  /** What a screen reader says for the key. */
  name: string
  /** A modifier whose face waits for the platform. */
  pending?: true
}

type PlatformFaces = Record<KeyPlatform, KeyFace>

const FACES: Record<string, KeyFace | PlatformFaces> = {
  enter: { glyph: KeyReturnIcon, label: 'Enter', name: 'Enter' },
  escape: { label: 'Esc', name: 'Escape' },
  tab: { label: 'Tab', name: 'Tab' },
  space: { label: 'Space', name: 'Space' },
  backspace: { glyph: BackspaceIcon, name: 'Backspace' },
  delete: { label: 'Del', name: 'Delete' },
  arrowup: { glyph: ArrowUpIcon, name: 'Up arrow' },
  arrowdown: { glyph: ArrowDownIcon, name: 'Down arrow' },
  arrowleft: { glyph: ArrowLeftIcon, name: 'Left arrow' },
  arrowright: { glyph: ArrowRightIcon, name: 'Right arrow' },
  mod: {
    apple: { glyph: CommandIcon, name: 'Command' },
    other: { label: 'Ctrl', name: 'Control' }
  },
  shift: {
    apple: { glyph: ArrowFatUpIcon, name: 'Shift' },
    other: { label: 'Shift', name: 'Shift' }
  },
  alt: {
    apple: { glyph: OptionIcon, name: 'Option' },
    other: { label: 'Alt', name: 'Alt' }
  },
  ctrl: {
    apple: { glyph: ControlIcon, name: 'Control' },
    other: { label: 'Ctrl', name: 'Control' }
  }
}

const ALIASES: Record<string, string> = {
  return: 'enter',
  esc: 'escape',
  del: 'delete',
  up: 'arrowup',
  down: 'arrowdown',
  left: 'arrowleft',
  right: 'arrowright',
  option: 'alt',
  control: 'ctrl'
}

function normalise(key: string) {
  if (key === ' ') return 'space'
  const id = key.toLowerCase().replace(/[\s_-]+/g, '')
  return ALIASES[id] ?? id
}

export function keyFace(key: string, platform: KeyPlatform | null): KeyFace {
  const face = FACES[normalise(key)]
  if (!face) {
    const label = key.length === 1 ? key.toUpperCase() : key
    return { label, name: label }
  }
  if (!('apple' in face)) return face
  return platform ? face[platform] : { ...face.other, pending: true }
}
