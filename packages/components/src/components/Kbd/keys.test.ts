import { describe, expect, it } from 'vitest'

import {
  ArrowDownGlyph,
  ArrowFatUpGlyph,
  ArrowLeftGlyph,
  ArrowRightGlyph,
  ArrowUpGlyph,
  BackspaceGlyph,
  CommandGlyph,
  ControlGlyph,
  KeyReturnGlyph,
  OptionGlyph
} from './glyphs'
import { keyFace } from './keys'

describe('keyFace', () => {
  it.each([
    ['enter', { glyph: KeyReturnGlyph, label: 'Enter', name: 'Enter' }],
    ['Return', { glyph: KeyReturnGlyph, label: 'Enter', name: 'Enter' }],
    ['Escape', { label: 'Esc', name: 'Escape' }],
    ['esc', { label: 'Esc', name: 'Escape' }],
    ['TAB', { label: 'Tab', name: 'Tab' }],
    ['space', { label: 'Space', name: 'Space' }],
    [' ', { label: 'Space', name: 'Space' }],
    ['backspace', { glyph: BackspaceGlyph, name: 'Backspace' }],
    ['Delete', { label: 'Del', name: 'Delete' }],
    ['ArrowUp', { glyph: ArrowUpGlyph, name: 'Up arrow' }],
    ['arrow down', { glyph: ArrowDownGlyph, name: 'Down arrow' }],
    ['left', { glyph: ArrowLeftGlyph, name: 'Left arrow' }],
    ['arrow-right', { glyph: ArrowRightGlyph, name: 'Right arrow' }]
  ])('maps %j the same on every platform', (key, face) => {
    expect(keyFace(key, 'apple')).toEqual(face)
    expect(keyFace(key, 'other')).toEqual(face)
    expect(keyFace(key, null)).toEqual(face)
  })

  it.each([
    [
      'mod',
      { glyph: CommandGlyph, name: 'Command' },
      { label: 'Ctrl', name: 'Control' }
    ],
    [
      'Shift',
      { glyph: ArrowFatUpGlyph, name: 'Shift' },
      { label: 'Shift', name: 'Shift' }
    ],
    [
      'alt',
      { glyph: OptionGlyph, name: 'Option' },
      { label: 'Alt', name: 'Alt' }
    ],
    [
      'option',
      { glyph: OptionGlyph, name: 'Option' },
      { label: 'Alt', name: 'Alt' }
    ],
    [
      'cmd',
      { glyph: CommandGlyph, name: 'Command' },
      { label: 'Ctrl', name: 'Control' }
    ],
    [
      'command',
      { glyph: CommandGlyph, name: 'Command' },
      { label: 'Ctrl', name: 'Control' }
    ],
    [
      'Meta',
      { glyph: CommandGlyph, name: 'Command' },
      { label: 'Win', name: 'Windows' }
    ],
    [
      'ctrl',
      { glyph: ControlGlyph, name: 'Control' },
      { label: 'Ctrl', name: 'Control' }
    ],
    [
      'Control',
      { glyph: ControlGlyph, name: 'Control' },
      { label: 'Ctrl', name: 'Control' }
    ]
  ])('maps the modifier %j per platform', (key, apple, other) => {
    expect(keyFace(key, 'apple')).toEqual(apple)
    expect(keyFace(key, 'other')).toEqual(other)
  })

  it('holds a modifier back until the platform is known', () => {
    expect(keyFace('mod', null)).toBeNull()
  })

  it.each([
    ['k', { label: 'K', name: 'K' }],
    ['/', { label: '/', name: '/' }],
    ['F5', { label: 'F5', name: 'F5' }],
    ['⌘D', { label: '⌘D', name: '⌘D' }],
    ['-', { label: '-', name: '-' }]
  ])('shows the unknown key %j as text', (key, face) => {
    expect(keyFace(key, 'apple')).toEqual(face)
  })
})
