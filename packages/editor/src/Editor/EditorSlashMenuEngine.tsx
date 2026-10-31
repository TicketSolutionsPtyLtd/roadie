'use client'

import { type RefObject, use, useEffect, useId, useRef, useState } from 'react'

import { posToDOMRect } from '@tiptap/core'
import { type Editor as TiptapEditor, useEditorState } from '@tiptap/react'

import { listItemVariants } from '@oztix/roadie-components/list'
import { Popover } from '@oztix/roadie-components/popover'
import { cn } from '@oztix/roadie-core/utils'

import { EditorContext } from './EditorContext'
import type { EditorSlashMenuProps } from './EditorSlashMenu'
import {
  type EditorControlUi,
  type EditorSlashItem,
  customSlashItem,
  presetSlashItems
} from './controls'
import { type SlashMatch, closeSlashMenu, slashMatch } from './slashMenu'

function matching(items: readonly EditorSlashItem[], query: string) {
  const typed = query.trim().toLowerCase()
  return items.filter(({ label, keywords = [] }) =>
    [label, ...keywords].some((word) => word.toLowerCase().includes(typed))
  )
}

type KeyDown = (event: KeyboardEvent) => boolean

type MenuProps = EditorSlashMenuProps & {
  editor: TiptapEditor
  keyDownRef: RefObject<KeyDown | null>
  ui: EditorControlUi
  items: readonly EditorSlashItem[]
  match: SlashMatch
}

function SlashMenuList({
  editor,
  keyDownRef,
  ui,
  items,
  match,
  className
}: MenuProps) {
  const listId = useId()
  // The active option resets to the first whenever the query changes.
  const [active, setActive] = useState({ query: match.query, index: 0 })
  const shown = matching(items, match.query)
  const index = active.query === match.query ? active.index : 0
  const current = shown[index]
  const optionId = (at: number) => `${listId}-${at}`

  // Read at the key, since the last render can be a character behind.
  const insert = (item: EditorSlashItem) =>
    item.run(editor, ui, slashMatch(editor.state) ?? match)
  const close = () => editor.view.dispatch(closeSlashMenu(editor.state))

  useEffect(() => {
    keyDownRef.current = (event) => {
      if (event.key === 'Escape') {
        close()
        return true
      }
      const modified =
        event.shiftKey || event.altKey || event.ctrlKey || event.metaKey
      // Shift+Enter breaks the line, and Mod+Enter is the app's to take.
      if (event.key === 'Enter' && current && !modified) {
        insert(current)
        return true
      }
      const step = { ArrowDown: 1, ArrowUp: -1 }[event.key]
      if (!step || shown.length === 0) return false
      const next = (index + step + shown.length) % shown.length
      setActive({ query: match.query, index: next })
      return true
    }
  })
  useEffect(
    () => () => {
      keyDownRef.current = null
    },
    [keyDownRef]
  )

  // Focus stays in the text, which points at the active option.
  useEffect(() => {
    const textbox = editor.view.dom
    textbox.setAttribute('aria-controls', listId)
    return () => {
      textbox.removeAttribute('aria-controls')
      textbox.removeAttribute('aria-activedescendant')
    }
  }, [editor, listId])

  useEffect(() => {
    const textbox = editor.view.dom
    if (current) {
      textbox.setAttribute('aria-activedescendant', optionId(index))
      document.getElementById(optionId(index))?.scrollIntoView({
        block: 'nearest'
      })
    } else {
      textbox.removeAttribute('aria-activedescendant')
    }
  })

  const anchor = {
    getBoundingClientRect: () =>
      posToDOMRect(editor.view, match.from, match.from)
  }

  return (
    <Popover
      open
      onOpenChange={(open) => {
        if (!open) close()
      }}
    >
      <Popover.Content
        side='bottom'
        align='start'
        initialFocus={false}
        finalFocus={false}
        positionerProps={{ anchor }}
        className={cn(
          'max-h-[min(20rem,var(--available-height))] w-64 gap-0 overflow-y-auto p-1',
          className
        )}
        // A press inside would take focus, and the caret, out of the text.
        onMouseDown={(event) => event.preventDefault()}
      >
        <ul
          id={listId}
          role='listbox'
          aria-label='Blocks'
          className='grid gap-0.5'
        >
          {shown.map((item, at) => {
            const Icon = item.icon
            return (
              <li
                key={item.label}
                id={optionId(at)}
                role='option'
                aria-selected={at === index}
                className={cn(
                  listItemVariants({ selected: at === index }),
                  'min-h-10 cursor-default items-center gap-3 text-sm'
                )}
                onClick={() => insert(item)}
              >
                <Icon weight='bold' className='size-4' aria-hidden />
                <span>{item.label}</span>
              </li>
            )
          })}
        </ul>
        {shown.length === 0 ? (
          <p role='status' className='px-3 py-2 text-sm text-subtle'>
            No matching blocks
          </p>
        ) : null}
      </Popover.Content>
    </Popover>
  )
}

/** The loaded slash menu, which `Editor.SlashMenu` renders. */
export function EditorSlashMenuEngine(props: EditorSlashMenuProps) {
  const context = use(EditorContext)
  if (!context) throw new Error('Editor.SlashMenu must be inside an Editor.')
  const { editor, preset, slashMenuRef } = context
  const {
    editLink,
    editAlt,
    editEmbed,
    pickImage,
    replaceImage,
    editButton,
    editVariable
  } = context
  const ui = {
    editLink,
    editAlt,
    editEmbed,
    pickImage,
    replaceImage,
    editButton,
    editVariable
  }
  const keyDownRef = useRef<KeyDown>(null)
  const match = useEditorState({
    editor,
    selector: ({ editor: current }) =>
      current?.isEditable ? slashMatch(current.state) : null
  })
  const items = [
    ...presetSlashItems[preset],
    ...context.blocks.map(customSlashItem)
  ].filter((item) => item.available?.(ui) ?? true)
  // Registered while mounted, so a `/` opens nothing without the menu.
  const hasItems = items.length > 0
  useEffect(() => {
    if (!hasItems) return
    slashMenuRef.current = {
      onKeyDown: (event) => keyDownRef.current?.(event) ?? false
    }
    return () => {
      slashMenuRef.current = null
    }
  }, [hasItems, slashMenuRef])

  if (!editor || !match || items.length === 0) return null
  return (
    <SlashMenuList
      key={match.from}
      {...props}
      editor={editor}
      keyDownRef={keyDownRef}
      ui={ui}
      items={items}
      match={match}
    />
  )
}
