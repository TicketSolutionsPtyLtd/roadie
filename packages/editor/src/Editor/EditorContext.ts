'use client'

import { type ComponentType, type RefObject, createContext } from 'react'

import type { EditorContent, Editor as TiptapEditor } from '@tiptap/react'

import type { EditorToolbarProps } from './EditorToolbar'
import type { EditorEmphasis, EditorSize } from './variants'

// The engine's parts travel through context, so the shell never imports Tiptap.
export type EditorContextValue = {
  editor: TiptapEditor | null
  size: EditorSize
  emphasis: EditorEmphasis
  contentId: string
  toolbarRef: RefObject<HTMLDivElement | null>
  /** Opens the link editor on the selection. */
  editLink: () => void
  TiptapContent: typeof EditorContent
  ToolbarEngine: ComponentType<EditorToolbarProps>
}

export const EditorContext = createContext<EditorContextValue | null>(null)
