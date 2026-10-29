'use client'

import { type ComponentType, type RefObject, createContext } from 'react'

import type { EditorContent, Editor as TiptapEditor } from '@tiptap/react'

import type { EmbedProvider, Preset } from '../schema'
import type { EditorBubbleMenuProps } from './EditorBubbleMenu'
import type { EditorToolbarProps } from './EditorToolbar'
import type { EditorEmphasis, EditorSize } from './variants'

// The engine's parts travel through context, so the shell never imports Tiptap.
export type EditorContextValue = {
  editor: TiptapEditor | null
  preset: Preset
  size: EditorSize
  emphasis: EditorEmphasis
  contentId: string
  toolbarRef: RefObject<HTMLDivElement | null>
  bubbleMenuRef: RefObject<HTMLDivElement | null>
  /** Opens the link editor on the selection. */
  editLink: () => void
  /** Whether the link editor is open. */
  editingLink: boolean
  /** Opens the alt text editor on the selected image. */
  editAlt: () => void
  /** Opens the embed editor at the selection, or on the selected embed. */
  editEmbed: () => void
  embedProviders: readonly EmbedProvider[]
  /** Opens the file picker for `onUploadImage`, or undefined without it. */
  pickImage: (() => void) | undefined
  /** Opens the file picker to replace the selected image, or undefined without `onUploadImage`. */
  replaceImage: (() => void) | undefined
  TiptapContent: typeof EditorContent
  ToolbarEngine: ComponentType<EditorToolbarProps>
  BubbleMenuEngine: ComponentType<EditorBubbleMenuProps>
}

export const EditorContext = createContext<EditorContextValue | null>(null)
