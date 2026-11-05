'use client'

import { useLayoutEffect, useState } from 'react'

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CopySimpleIcon,
  DotsSixIcon,
  TrashIcon
} from '@phosphor-icons/react'
import { closeHistory } from '@tiptap/pm/history'
import type { Transaction } from '@tiptap/pm/state'
import type { Editor as TiptapEditor } from '@tiptap/react'

import { IconButton } from '@oztix/roadie-components/button'
import { Menu } from '@oztix/roadie-components/menu'

import {
  canAddColumn,
  canMoveColumn,
  canRemoveColumn,
  deleteColumn,
  duplicateColumn,
  moveColumn
} from './blockActions'
import { focusEditor } from './focusEditor'

const HANDLE_SIZE = 24

type EditorColumnHandleProps = {
  editor: TiptapEditor
  wrapper: HTMLElement
  /** Where the column the block handle's block sits in starts. */
  column: number | null
  /** The column its menu is open on, kept by the block handle through edits. */
  menuAt: number | null
  onMenuAtChange: (pos: number | null) => void
}

/**
 * A grip above the column holding the hovered or caret's block, whose menu
 * moves, copies or deletes the whole column.
 */
export function EditorColumnHandle({
  editor,
  wrapper,
  column,
  menuAt,
  onMenuAtChange: setMenuAt
}: EditorColumnHandleProps) {
  const [place, setPlace] = useState<{ top: number; left: number } | null>(null)
  const shown = menuAt ?? column

  useLayoutEffect(() => {
    const dom = shown === null ? null : editor.view.nodeDOM(shown)
    if (!(dom instanceof HTMLElement)) {
      setPlace(null)
      return
    }
    const box = dom.getBoundingClientRect()
    const frame = wrapper.getBoundingClientRect()
    const top = box.top - frame.top - HANDLE_SIZE
    const left = box.left - frame.left + (box.width - HANDLE_SIZE) / 2
    // After every render, as an edit anywhere above can move the column.
    setPlace((last) =>
      last?.top === top && last.left === left ? last : { top, left }
    )
  })

  if (shown === null || !place) return null
  const { doc } = editor.state
  if (doc.nodeAt(shown)?.type.name !== 'column') return null

  const run = (action: () => Transaction | null) => {
    const tr = action()
    if (tr) editor.view.dispatch(closeHistory(tr))
  }
  // The menu stays open on the column where it lands.
  const move = (step: -1 | 1) => {
    run(() => moveColumn(editor.state, shown, step))
    const { $from } = editor.state.selection
    for (let depth = $from.depth; depth > 0; depth--) {
      if ($from.node(depth).type.name === 'column') {
        setMenuAt($from.before(depth))
        return
      }
    }
  }

  return (
    <Menu
      open={menuAt !== null}
      onOpenChange={(open) => {
        if (!open) setMenuAt(null)
      }}
    >
      <Menu.Trigger
        render={
          <IconButton
            size='xs'
            emphasis='subtler'
            aria-label='Column actions'
            // As the block grip: shown only by its column, so no Tab stop.
            tabIndex={-1}
            data-slot='editor-column-handle'
            className='absolute text-subtle'
            style={place}
            onClick={() => setMenuAt(shown)}
          >
            <DotsSixIcon weight='bold' className='size-4' aria-hidden />
          </IconButton>
        }
      />
      <Menu.Content
        side='top'
        align='center'
        finalFocus={() => {
          focusEditor(editor)
          return false
        }}
      >
        <Menu.Group>
          <Menu.GroupLabel>Column</Menu.GroupLabel>
          <Menu.Item
            icon={<ArrowLeftIcon weight='bold' />}
            disabled={!canMoveColumn(doc, shown, -1)}
            closeOnClick={false}
            onClick={() => move(-1)}
          >
            Move left
          </Menu.Item>
          <Menu.Item
            icon={<ArrowRightIcon weight='bold' />}
            disabled={!canMoveColumn(doc, shown, 1)}
            closeOnClick={false}
            onClick={() => move(1)}
          >
            Move right
          </Menu.Item>
          <Menu.Item
            icon={<CopySimpleIcon weight='bold' />}
            disabled={!canAddColumn(doc, shown)}
            onClick={() => run(() => duplicateColumn(editor.state, shown))}
          >
            Duplicate
          </Menu.Item>
          <Menu.Separator />
          <Menu.Item
            icon={<TrashIcon weight='bold' />}
            intent='danger'
            disabled={!canRemoveColumn(doc, shown)}
            onClick={() => run(() => deleteColumn(editor.state, shown))}
          >
            Delete
          </Menu.Item>
        </Menu.Group>
      </Menu.Content>
    </Menu>
  )
}
