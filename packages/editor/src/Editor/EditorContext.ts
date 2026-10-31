'use client'

import {
  type ComponentType,
  type ReactNode,
  type RefObject,
  createContext
} from 'react'

import type { EditorContent, Editor as TiptapEditor } from '@tiptap/react'

import type { EditorBlock } from '../extensions'
import type { EditorVariable, EmbedProvider, Preset } from '../schema'
import type { EditorBubbleMenuProps } from './EditorBubbleMenu'
import type { EditorSlashMenuProps } from './EditorSlashMenu'
import type { EditorToolbarProps } from './EditorToolbar'
import type { SlashMenuHandle } from './slashMenu'
import type { EditorEmphasis, EditorSize, EditorToolbarMode } from './variants'

// The engine's parts travel through context, so the shell never imports Tiptap.
export type EditorContextValue = {
  editor: TiptapEditor | null
  preset: Preset
  size: EditorSize
  emphasis: EditorEmphasis
  contentId: string
  /** The toolbar showing, which is docked on a phone whatever was chosen. */
  toolbar: EditorToolbarMode
  /** Whether the toolbar showing offers to pin or unpin itself. */
  pinnable: boolean
  setToolbar: (toolbar: EditorToolbarMode) => void
  /** `Editor.Toolbar`'s children, which a floating toolbar puts in its … menu. */
  toolbarExtras: ReactNode
  setToolbarExtras: (extras: ReactNode) => void
  /** Set while a floating toolbar is mounted, to show it at the caret and focus it. */
  openBubbleMenuRef: RefObject<(() => boolean) | null>
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
  variables: readonly EditorVariable[] | undefined
  /** The app's own blocks, which the slash menu offers after the preset's. */
  blocks: readonly EditorBlock[]
  /** Opens the file picker for `onUploadImage`, or undefined without it. */
  pickImage: (() => void) | undefined
  /** Opens the file picker to replace the selected image, or undefined without `onUploadImage`. */
  replaceImage: (() => void) | undefined
  /** Opens the button link editor, on the button at the selection if there is one. */
  editButton: () => void
  editVariable: () => void
  TiptapContent: typeof EditorContent
  ToolbarEngine: ComponentType<EditorToolbarProps>
  BubbleMenuEngine: ComponentType<EditorBubbleMenuProps>
  SlashMenuEngine: ComponentType<EditorSlashMenuProps>
  /** Set while an `Editor.SlashMenu` is mounted, so a typed `/` opens it. */
  slashMenuRef: RefObject<SlashMenuHandle | null>
}

export const EditorContext = createContext<EditorContextValue | null>(null)
