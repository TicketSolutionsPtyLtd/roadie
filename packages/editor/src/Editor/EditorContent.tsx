'use client'

import { type ComponentProps, use } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { EditorContext } from './EditorContext'

export type EditorContentProps = Omit<ComponentProps<'div'>, 'children' | 'ref'>

/** The editable area: a multiline textbox styled as `.prose` at the editor's size. */
export function EditorContent({ className, ...props }: EditorContentProps) {
  const context = use(EditorContext)
  if (!context) throw new Error('Editor.Content must be inside an Editor.')
  const { editor, TiptapContent, preview, preheader } = context
  return (
    <>
      {preview ?? preheader}
      <TiptapContent
        data-slot='editor-content'
        editor={editor}
        // The menus' plugins append them here, so they scroll with the text,
        // and the block handle sits beside each block, placed against this.
        className={cn('relative grid grow', className)}
        {...props}
        // Kept, so the caret, undo, and open menus are there to come back to.
        hidden={preview ? true : props.hidden}
      />
    </>
  )
}

EditorContent.displayName = 'Editor.Content'
