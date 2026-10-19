'use client'

import { type ReactNode, useEffect, useSyncExternalStore } from 'react'

import { useFieldContext } from '@oztix/roadie-components/field'
import { Skeleton } from '@oztix/roadie-components/skeleton'
import { cn } from '@oztix/roadie-core/utils'

import type { EditorValue } from '../schema'
import { loadedEngine, preloadEditor, subscribeToEngine } from './load'
import { startingValue } from './startingValue'
import {
  EDITOR_MIN_HEIGHT,
  EDITOR_TOOLBAR_HEIGHT,
  EDITOR_TOOLBAR_ROOM,
  type EditorEmphasis,
  type EditorSize,
  editorContentClass
} from './variants'

export type EditorRootProps = {
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
  'aria-label'?: string
  'aria-labelledby'?: string
  /** Replaces the default parts, `<Editor.Toolbar />` then `<Editor.Content />`. */
  children?: ReactNode
}

const notLoadedOnServer = () => undefined

/**
 * A rich-text editor that saves an `EditorValue` in the `basic` preset,
 * reading a value in another preset into it and keeping the text of what it
 * can't hold. It shows a skeleton on the server and until the editor's code
 * loads in the browser.
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
  return <engine.EditorEngine {...props} />
}

EditorRoot.displayName = 'Editor.Root'
