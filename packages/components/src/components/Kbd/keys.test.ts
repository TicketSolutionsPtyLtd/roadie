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
import { describe, expect, it } from 'vitest'

import { keyFace } from './keys'

describe('keyFace', () => {
  it.each([
    ['enter', { glyph: KeyReturnIcon, label: 'Enter', name: 'Enter' }],
    ['Return', { glyph: KeyReturnIcon, label: 'Enter', name: 'Enter' }],
    ['Escape', { label: 'Esc', name: 'Escape' }],
    ['esc', { label: 'Esc', name: 'Escape' }],
    ['TAB', { label: 'Tab', name: 'Tab' }],
    ['space', { label: 'Space', name: 'Space' }],
    [' ', { label: 'Space', name: 'Space' }],
    ['backspace', { glyph: BackspaceIcon, name: 'Backspace' }],
    ['Delete', { label: 'Del', name: 'Delete' }],
    ['ArrowUp', { glyph: ArrowUpIcon, name: 'Up arrow' }],
    ['arrow down', { glyph: ArrowDownIcon, name: 'Down arrow' }],
    ['left', { glyph: ArrowLeftIcon, name: 'Left arrow' }],
    ['arrow-right', { glyph: ArrowRightIcon, name: 'Right arrow' }]
  ])('maps %j the same on every platform', (key, face) => {
    expect(keyFace(key, 'apple')).toEqual(face)
    expect(keyFace(key, 'other')).toEqual(face)
    expect(keyFace(key, null)).toEqual(face)
  })

  it.each([
    [
      'mod',
      { glyph: CommandIcon, name: 'Command' },
      { label: 'Ctrl', name: 'Control' }
    ],
    [
      'Shift',
      { glyph: ArrowFatUpIcon, name: 'Shift' },
      { label: 'Shift', name: 'Shift' }
    ],
    [
      'alt',
      { glyph: OptionIcon, name: 'Option' },
      { label: 'Alt', name: 'Alt' }
    ],
    [
      'option',
      { glyph: OptionIcon, name: 'Option' },
      { label: 'Alt', name: 'Alt' }
    ],
    [
      'cmd',
      { glyph: CommandIcon, name: 'Command' },
      { label: 'Ctrl', name: 'Control' }
    ],
    [
      'command',
      { glyph: CommandIcon, name: 'Command' },
      { label: 'Ctrl', name: 'Control' }
    ],
    [
      'Meta',
      { glyph: CommandIcon, name: 'Command' },
      { label: 'Win', name: 'Windows' }
    ],
    [
      'ctrl',
      { glyph: ControlIcon, name: 'Control' },
      { label: 'Ctrl', name: 'Control' }
    ],
    [
      'Control',
      { glyph: ControlIcon, name: 'Control' },
      { label: 'Ctrl', name: 'Control' }
    ]
  ])('maps the modifier %j per platform', (key, apple, other) => {
    expect(keyFace(key, 'apple')).toEqual(apple)
    expect(keyFace(key, 'other')).toEqual(other)
  })

  it('holds a modifier pending until the platform is known', () => {
    expect(keyFace('mod', null)).toEqual({
      label: 'Ctrl',
      name: 'Control',
      pending: true
    })
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
