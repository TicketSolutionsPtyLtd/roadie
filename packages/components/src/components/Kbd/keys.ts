import type { ComponentType } from 'react'

import {
  ArrowDownGlyph,
  ArrowFatUpGlyph,
  ArrowLeftGlyph,
  ArrowRightGlyph,
  ArrowUpGlyph,
  BackspaceGlyph,
  CommandGlyph,
  ControlGlyph,
  type GlyphProps,
  KeyReturnGlyph,
  OptionGlyph
} from './glyphs'
import type { KeyPlatform } from './platform'

export type KeyFace = {
  glyph?: ComponentType<GlyphProps>
  label?: string
  /** What a screen reader says for the key. */
  name: string
}

type PlatformFaces = Record<KeyPlatform, KeyFace>

const FACES: Record<string, KeyFace | PlatformFaces> = {
  enter: { glyph: KeyReturnGlyph, label: 'Enter', name: 'Enter' },
  escape: { label: 'Esc', name: 'Escape' },
  tab: { label: 'Tab', name: 'Tab' },
  space: { label: 'Space', name: 'Space' },
  backspace: { glyph: BackspaceGlyph, name: 'Backspace' },
  delete: { label: 'Del', name: 'Delete' },
  arrowup: { glyph: ArrowUpGlyph, name: 'Up arrow' },
  arrowdown: { glyph: ArrowDownGlyph, name: 'Down arrow' },
  arrowleft: { glyph: ArrowLeftGlyph, name: 'Left arrow' },
  arrowright: { glyph: ArrowRightGlyph, name: 'Right arrow' },
  mod: {
    apple: { glyph: CommandGlyph, name: 'Command' },
    other: { label: 'Ctrl', name: 'Control' }
  },
  meta: {
    apple: { glyph: CommandGlyph, name: 'Command' },
    other: { label: 'Win', name: 'Windows' }
  },
  shift: {
    apple: { glyph: ArrowFatUpGlyph, name: 'Shift' },
    other: { label: 'Shift', name: 'Shift' }
  },
  alt: {
    apple: { glyph: OptionGlyph, name: 'Option' },
    other: { label: 'Alt', name: 'Alt' }
  },
  ctrl: {
    apple: { glyph: ControlGlyph, name: 'Control' },
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
  cmd: 'mod',
  command: 'mod',
  option: 'alt',
  control: 'ctrl'
}

export function normalise(key: string) {
  if (key === ' ') return 'space'
  const id = key.toLowerCase().replace(/[\s_-]+/g, '')
  return ALIASES[id] ?? id
}

/** The key's face, or null for a modifier whose face waits for the platform. */
export function keyFace(
  key: string,
  platform: KeyPlatform | null
): KeyFace | null {
  const face = FACES[normalise(key)]
  if (!face) {
    const label = key.length === 1 ? key.toUpperCase() : key
    return { label, name: label }
  }
  if (!('apple' in face)) return face
  return platform ? face[platform] : null
}
