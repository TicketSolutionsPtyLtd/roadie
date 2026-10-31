'use client'

import { use } from 'react'

import { EditorContext } from './EditorContext'

export type EditorSlashMenuProps = {
  /** Classes for the menu's popup. */
  className?: string
}

/**
 * The menu a `/` typed in an empty paragraph opens, listing the preset's
 * blocks; it renders nothing in a preset without one. Arrow keys move, Enter
 * inserts, and Escape closes, leaving the `/`.
 */
export function EditorSlashMenu(props: EditorSlashMenuProps) {
  const context = use(EditorContext)
  if (!context) throw new Error('Editor.SlashMenu must be inside an Editor.')
  const { SlashMenuEngine } = context
  return <SlashMenuEngine {...props} />
}

EditorSlashMenu.displayName = 'Editor.SlashMenu'
