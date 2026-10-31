'use client'

import { type ReactNode, useEffect, useSyncExternalStore } from 'react'

import { useFieldContext } from '@oztix/roadie-components/field'
import { Skeleton } from '@oztix/roadie-components/skeleton'
import { cn } from '@oztix/roadie-core/utils'

import type { EditorBlock } from '../extensions'
import type { EditorValue, EmbedProvider, Preset } from '../schema'
import { loadedEngine, preloadEditor, subscribeToEngine } from './load'
import { resolvedPreset, startingValue } from './startingValue'
import {
  EDITOR_MIN_HEIGHT,
  EDITOR_TOOLBAR_HEIGHT,
  EDITOR_TOOLBAR_ROOM,
  type EditorEmphasis,
  type EditorSize,
  editorContentClass
} from './variants'

export type EditorRootProps = {
  /**
   * The nodes and marks the document may hold. A value in another preset is
   * read into this one, keeping the text of what it can't hold.
   * @default the value's preset, or 'basic'
   */
  preset?: Preset
  /** The document, for a controlled editor. */
  value?: EditorValue
  /** The starting document, for an uncontrolled editor. */
  defaultValue?: EditorValue
  /** Called with the whole document on each change. */
  onValueChange?: (value: EditorValue) => void
  /** Shown while the document is empty. */
  placeholder?: string
  readOnly?: boolean
  /** Takes no input and dims, as does a disabled `Field` around it. */
  disabled?: boolean
  /** Submits the value as JSON with a native form, under this name. */
  name?: string
  /**
   * Body size, matching `Prose`'s sizes.
   * @default 'md'
   */
  size?: EditorSize
  /**
   * The frame. `normal` and `subtle` match `Textarea`'s; `subtler` has none,
   * for content edited in place on the page.
   * @default 'normal'
   */
  emphasis?: EditorEmphasis
  className?: string
  /**
   * Uploads an image the person picks, pastes, or drops, and resolves to
   * where it's served: https, or a path on this site. Without it the editor
   * has no image control and ignores image files. A rejection's message shows
   * in `Field.ErrorText`.
   */
  onUploadImage?: (file: File) => Promise<{ src: string; alt?: string }>
  /**
   * The providers the editor embeds from, matching what renders the value.
   * @default defaultEmbedProviders
   */
  embedProviders?: readonly EmbedProvider[]
  /**
   * Resolves a link no provider reads, such as a short link, to one it can.
   * Called when one is entered in the Embed control; run it on your server.
   */
  resolveUrl?: (url: string) => Promise<string>
  /**
   * An app's own blocks, from `@oztix/roadie-editor/extensions`, for the
   * `blocks` preset. Each saves its attrs, shows in the slash menu, and
   * renders with `/render`'s matching `nodeMapping` entry. Read once, when
   * the editor is created.
   */
  extensions?: readonly EditorBlock[]
  'aria-label'?: string
  'aria-labelledby'?: string
  /**
   * Replaces the default parts: `<Editor.Toolbar />`, `<Editor.Content />`,
   * then `<Editor.SlashMenu />`.
   */
  children?: ReactNode
}

const notLoadedOnServer = () => undefined

/**
 * A rich-text editor that saves an `EditorValue`. It shows a skeleton on the
 * server and until the editor's code loads in the browser.
 */
export function EditorRoot(props: EditorRootProps) {
  const engine = useSyncExternalStore(
    subscribeToEngine,
    loadedEngine,
    notLoadedOnServer
  )
  const field = useFieldContext()
  useEffect(() => {
    void preloadEditor()
  }, [])

  if (!engine) {
    const size = props.size ?? 'md'
    const emphasis = props.emphasis ?? 'normal'
    const toolbarRoom = (
      <div
        className={cn(
          EDITOR_TOOLBAR_ROOM[emphasis],
          'h-(--editor-toolbar-height)'
        )}
      />
    )
    const frame = cn(
      'flex min-w-0 flex-col',
      EDITOR_MIN_HEIGHT[size],
      EDITOR_TOOLBAR_HEIGHT[size]
    )
    // Laid out as the loaded editor is, so loading doesn't move the page.
    return (
      <>
        {emphasis === 'subtler' ? (
          <div
            aria-hidden='true'
            data-slot='editor-skeleton'
            className={cn(frame, props.className)}
          >
            {toolbarRoom}
            <div className={editorContentClass(size, emphasis)}>
              {/* One block, so prose's flow spacing doesn't add to its height. */}
              <div className='grid gap-2'>
                <Skeleton />
                <Skeleton />
                <Skeleton className='w-2/3' />
              </div>
            </div>
          </div>
        ) : (
          <Skeleton
            shape='block'
            className={cn(frame, 'h-auto rounded-lg', props.className)}
          >
            {toolbarRoom}
            <div className={editorContentClass(size, emphasis)} />
          </Skeleton>
        )}
        {props.name ? (
          // A form sent before the editor loads still carries the value.
          <input
            type='hidden'
            data-slot='editor-value'
            name={props.name}
            disabled={props.disabled || field.disabled}
            value={JSON.stringify(startingValue(props))}
          />
        ) : null}
      </>
    )
  }
  // Tiptap fixes the schema when it creates the editor, so a new preset needs
  // a new editor.
  return <engine.EditorEngine key={resolvedPreset(props)} {...props} />
}

EditorRoot.displayName = 'Editor.Root'
