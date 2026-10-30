'use client'

import { use } from 'react'

import type { ToolbarProps } from '@oztix/roadie-components/toolbar'

import { EditorContext } from './EditorContext'

export type EditorBubbleMenuProps = Omit<
  ToolbarProps,
  'size' | 'emphasis' | 'aria-controls' | 'ref'
>

/**
 * The preset's inline marks and Link, then `children`, in a menu over a text
 * selection. Alt+F10 moves focus to it while it shows, and Escape moves it
 * back.
 */
export function EditorBubbleMenu(props: EditorBubbleMenuProps) {
  const context = use(EditorContext)
  if (!context) throw new Error('Editor.BubbleMenu must be inside an Editor.')
  const { BubbleMenuEngine } = context
  return <BubbleMenuEngine {...props} />
}

EditorBubbleMenu.displayName = 'Editor.BubbleMenu'
