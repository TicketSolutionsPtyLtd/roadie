import { EditorBubbleMenu } from './EditorBubbleMenu'
import { EditorContent } from './EditorContent'
import { EditorRoot } from './EditorRoot'
import { EditorSlashMenu } from './EditorSlashMenu'
import { EditorToolbar } from './EditorToolbar'

const Editor = EditorRoot as typeof EditorRoot & {
  Root: typeof EditorRoot
  Toolbar: typeof EditorToolbar
  Content: typeof EditorContent
  BubbleMenu: typeof EditorBubbleMenu
  SlashMenu: typeof EditorSlashMenu
}

Editor.Root = EditorRoot
Editor.Toolbar = EditorToolbar
Editor.Content = EditorContent
Editor.BubbleMenu = EditorBubbleMenu
Editor.SlashMenu = EditorSlashMenu

export { Editor }
export type { EditorRootProps as EditorProps } from './EditorRoot'
export type { EditorBubbleMenuProps } from './EditorBubbleMenu'
export type { EditorSlashMenuProps } from './EditorSlashMenu'
export type { EditorToolbarProps } from './EditorToolbar'
export { preloadEditor } from './load'
export { useEditorContext } from './useEditorContext'
export type { EditorEmphasis, EditorSize } from './variants'
