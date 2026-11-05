'use client'

import { use } from 'react'

import type { ToolbarProps } from '@oztix/roadie-components/toolbar'

import { EditorContext } from './EditorContext'

export type EditorBubbleMenuProps = Omit<
  ToolbarProps,
  'size' | 'emphasis' | 'aria-controls' | 'ref'
>

/**
 * The floating toolbar, for `toolbar='floating'`: the preset's text controls,
 * then `children`, then a … menu with the rest, over a text selection.
 * Alt+F10 moves focus to it, opening it at the caret, and Escape moves it
 * back. It renders nothing while the toolbar is docked.
 */
export function EditorBubbleMenu(props: EditorBubbleMenuProps) {
  const context = use(EditorContext)
  if (!context) throw new Error('Editor.BubbleMenu must be inside an Editor.')
  const { BubbleMenuEngine } = context
  return <BubbleMenuEngine {...props} />
}

EditorBubbleMenu.displayName = 'Editor.BubbleMenu'
