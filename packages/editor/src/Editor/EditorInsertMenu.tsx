'use client'

import { useEffect, useRef } from 'react'

import type { Editor as TiptapEditor } from '@tiptap/react'
import { createPortal } from 'react-dom'

import type { InsertMenuState } from './insertMenu'

type EditorInsertMenuProps = {
  editor: TiptapEditor
  state: InsertMenuState | null
  id: string
  label: string
}

const optionId = (listboxId: string, index: number) => `${listboxId}-${index}`

/**
 * What `/` or `{{` can insert, under the caret. Focus stays in the editor,
 * which points `aria-activedescendant` at the active option.
 */
export function EditorInsertMenu({
  editor,
  state,
  id,
  label
}: EditorInsertMenuProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const mount = state?.mount
  const active = state ? optionId(id, state.active) : undefined

  useEffect(() => {
    const list = listRef.current
    if (!list || !mount) return
    return mount(list)
  }, [mount])

  useEffect(() => {
    const dom = editor.view.dom
    if (!active) return
    dom.setAttribute('aria-controls', id)
    dom.setAttribute('aria-activedescendant', active)
    document.getElementById(active)?.scrollIntoView({ block: 'nearest' })
    return () => {
      dom.removeAttribute('aria-controls')
      dom.removeAttribute('aria-activedescendant')
    }
  }, [editor, id, active])

  if (!state) return null
  return createPortal(
    <div
      ref={listRef}
      id={id}
      role='listbox'
      aria-label={label}
      data-slot='editor-insert-menu'
      className='z-popover grid max-h-80 min-w-56 gap-0.5 overflow-y-auto rounded-xl emphasis-floating is-translucent p-1'
      // A press here would otherwise take focus from the editor.
      onMouseDown={(event) => event.preventDefault()}
    >
      {state.items.map((item, index) => {
        const Icon = item.icon
        return (
          <div
            key={item.label}
            id={optionId(id, index)}
            role='option'
            aria-selected={index === state.active}
            onPointerMove={() => {
              if (index !== state.active) state.highlight(index)
            }}
            onClick={() => state.choose(index)}
            className='flex cursor-default items-center gap-2 rounded-lg px-3 py-2 text-sm text-normal select-none aria-selected:bg-subtle'
          >
            <Icon weight='bold' className='size-4 text-subtle' aria-hidden />
            {item.label}
          </div>
        )
      })}
    </div>,
    document.body
  )
}
