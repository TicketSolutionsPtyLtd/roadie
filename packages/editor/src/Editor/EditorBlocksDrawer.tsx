'use client'

import { useId, useRef } from 'react'

import type { Editor as TiptapEditor } from '@tiptap/react'
import { flushSync } from 'react-dom'

import { Drawer } from '@oztix/roadie-components/drawer'
import { IconTile } from '@oztix/roadie-components/icon-tile'

import type { EditorControlUi } from './controls'
import { insertBlockAfter, openLineAfter } from './emailEditing'
import { focusEditor } from './focusEditor'
import type { EditorInsertItem } from './insertItems'
import { inGroupOrder } from './menuGroups'
import { useOnPhone } from './toolbarMode'

type EditorBlocksDrawerProps = {
  editor: TiptapEditor
  open: boolean
  onOpenChange: (open: boolean) => void
  items: readonly EditorInsertItem[]
  ui: EditorControlUi
  /** Where blocks can go, as the block handle counts them. */
  containers: ReadonlySet<string>
}

const insertion = (item: EditorInsertItem, containers: ReadonlySet<string>) =>
  item.block
    ? insertBlockAfter(item.block, containers)
    : openLineAfter(containers)

function groupsOf(items: readonly EditorInsertItem[]) {
  const groups = new Map<string, EditorInsertItem[]>()
  for (const item of inGroupOrder(items)) {
    const group = item.group ?? 'More'
    groups.set(group, [...(groups.get(group) ?? []), item])
  }
  return [...groups]
}

const isFirst = (groupIndex: number, index: number) =>
  groupIndex === 0 && index === 0

/**
 * The preset's blocks as tiles, from the side on a desktop and the bottom on
 * a phone. A tile adds its block after the caret's, and hands focus back.
 */
export function EditorBlocksDrawer({
  editor,
  open,
  onOpenChange,
  items,
  ui,
  containers
}: EditorBlocksDrawerProps) {
  const phone = useOnPhone()
  const id = useId()
  // A pick hands focus on itself, which closing mustn't take back.
  const pickedRef = useRef(false)
  const firstTileRef = useRef<HTMLButtonElement>(null)

  const pick = (item: EditorInsertItem) => {
    pickedRef.current = true
    // Closed first, so the drawer lets go of focus before the block takes it.
    flushSync(() => onOpenChange(false))
    focusEditor(editor)
    editor.chain().command(insertion(item, containers)).run()
    if (!item.block) item.insert(editor.chain(), ui).run()
  }

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      side={phone ? 'bottom' : 'right'}
    >
      <Drawer.Content
        size={phone ? 'fit' : 'sm'}
        initialFocus={firstTileRef}
        finalFocus={() => {
          if (!pickedRef.current) focusEditor(editor)
          // The toolbar opens it without onOpenChange, so reset here.
          pickedRef.current = false
          return false
        }}
      >
        <Drawer.Header>
          <Drawer.Title>Blocks</Drawer.Title>
          <Drawer.Description>
            Adds a block after the one with the caret.
          </Drawer.Description>
        </Drawer.Header>
        <Drawer.Body className='grid content-start gap-6 pb-6'>
          {groupsOf(items).map(([group, tiles], groupIndex) => {
            const headingId = `${id}-group-${groupIndex}`
            return (
              <div
                key={group}
                role='group'
                aria-labelledby={headingId}
                className='grid gap-2'
              >
                <h3 id={headingId} className='text-display-ui-6 text-subtle'>
                  {group}
                </h3>
                <div className='grid grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] gap-2'>
                  {tiles.map((item, index) => {
                    const Icon = item.icon
                    return (
                      <button
                        key={item.label}
                        ref={
                          isFirst(groupIndex, index) ? firstTileRef : undefined
                        }
                        type='button'
                        disabled={
                          !editor.can().command(insertion(item, containers))
                        }
                        onClick={() => pick(item)}
                        className='is-interactive grid justify-items-center gap-2 rounded-xl emphasis-subtler p-3 text-center text-sm text-normal disabled:opacity-50'
                      >
                        <IconTile size='md' aria-hidden>
                          <Icon weight='bold' />
                        </IconTile>
                        {item.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </Drawer.Body>
      </Drawer.Content>
    </Drawer>
  )
}
