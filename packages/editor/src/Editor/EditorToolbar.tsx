'use client'

import { use } from 'react'

import type { ToolbarProps } from '@oztix/roadie-components/toolbar'

import { EditorContext } from './EditorContext'

export type EditorToolbarProps = Omit<
  ToolbarProps,
  'size' | 'aria-controls' | 'ref'
>

/**
 * The preset's formatting controls, then `children`, at the editor's size.
 * Alt+F10 in the content moves focus here, and Escape moves it back.
 */
export function EditorToolbar(props: EditorToolbarProps) {
  const context = use(EditorContext)
  if (!context) throw new Error('Editor.Toolbar must be inside an Editor.')
  const { ToolbarEngine } = context
  return <ToolbarEngine {...props} />
}

EditorToolbar.displayName = 'Editor.Toolbar'
