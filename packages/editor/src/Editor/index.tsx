import { EditorContent } from './EditorContent'
import { EditorRoot } from './EditorRoot'
import { EditorSlashMenu } from './EditorSlashMenu'
import { EditorToolbar } from './EditorToolbar'

const Editor = EditorRoot as typeof EditorRoot & {
  Root: typeof EditorRoot
  Toolbar: typeof EditorToolbar
  Content: typeof EditorContent
  SlashMenu: typeof EditorSlashMenu
}

Editor.Root = EditorRoot
Editor.Toolbar = EditorToolbar
Editor.Content = EditorContent
Editor.SlashMenu = EditorSlashMenu

export { Editor }
export type { EditorRootProps as EditorProps } from './EditorRoot'
export type { EditorSlashMenuProps } from './EditorSlashMenu'
export type { EditorToolbarProps } from './EditorToolbar'
export { preloadEditor } from './load'
export { useEditorContext } from './useEditorContext'
export type { EditorEmphasis, EditorSize } from './variants'
