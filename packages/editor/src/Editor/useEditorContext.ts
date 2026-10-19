'use client'

import { use } from 'react'

import type { Editor as TiptapEditor } from '@tiptap/react'

import { EditorContext } from './EditorContext'

/**
 * The Tiptap editor of the nearest `Editor`, for custom controls. `editor` is
 * null for the moment between the editor loading and mounting.
 */
export function useEditorContext(): { editor: TiptapEditor | null } {
  const context = use(EditorContext)
  if (!context) {
    throw new Error('useEditorContext must be called inside an Editor.')
  }
  return { editor: context.editor }
}
