'use client'

import {
  type KeyboardEvent,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore
} from 'react'

import type { Editor as TiptapEditor } from '@tiptap/react'
import { flushSync } from 'react-dom'

import { Drawer } from '@oztix/roadie-components/drawer'
import { EmptyState } from '@oztix/roadie-components/empty-state'
import { IconTile } from '@oztix/roadie-components/icon-tile'
import { Input } from '@oztix/roadie-components/input'

import type { EditorControlUi } from './controls'
import { insertBlockAfter, openLineAfter } from './emailEditing'
import { focusEditor } from './focusEditor'
import {
  type EditorInsertItem,
  namedInsertItems,
  rankedInsertItems
} from './insertItems'
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
  /** The group whose first tile takes focus, else the first group's. */
  startAt?: string
}

const insertion = (item: EditorInsertItem, containers: ReadonlySet<string>) =>
  item.block
    ? insertBlockAfter(item.block, item.containers ?? containers)
    : openLineAfter(containers)

function groupsOf(items: readonly EditorInsertItem[]) {
  const groups = new Map<string, EditorInsertItem[]>()
  for (const item of inGroupOrder(items)) {
    const group = item.group ?? 'More'
    groups.set(group, [...(groups.get(group) ?? []), item])
  }
  return [...groups]
}

const sectionsFirst = (groups: [string, EditorInsertItem[]][]) => [
  ...groups.filter(([group]) => group === 'Sections'),
  ...groups.filter(([group]) => group !== 'Sections')
]

// Wide enough to keep the email in view beside the drawer.
const WIDE = '(min-width: 1280px)'

function subscribeToWide(onChange: () => void) {
  const query = window.matchMedia(WIDE)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

const useWide = () =>
  useSyncExternalStore(
    subscribeToWide,
    () => window.matchMedia(WIDE).matches,
    () => false
  )

/**
 * Pads `root`'s end by as much of it as `popup`, pinned to the page's end,
 * covers, until the returned cleanup. The section settings drawer does the
 * same, and the two could share this.
 */
function makeRoomBeside(root: HTMLElement, popup: HTMLElement) {
  // The drawer is on the right whatever the direction, so physical padding.
  const previous = root.style.paddingRight
  // offsetWidth ignores the slide in, which a rect would catch midway.
  const fit = () => {
    root.style.paddingRight = previous
    const own = parseFloat(getComputedStyle(root).paddingRight)
    const covered =
      root.getBoundingClientRect().right -
      (document.documentElement.clientWidth - popup.offsetWidth)
    if (covered > 0) root.style.paddingRight = `${own + covered}px`
  }
  fit()
  const resizes = new ResizeObserver(fit)
  resizes.observe(root.parentElement ?? document.documentElement)
  window.addEventListener('resize', fit)
  return () => {
    resizes.disconnect()
    window.removeEventListener('resize', fit)
    root.style.paddingRight = previous
  }
}

const centre = (rect: DOMRect) => rect.left + rect.width / 2

/**
 * The tile an arrow key moves to: the next or previous in reading order, or
 * the nearest in the row above or below, across the headings.
 */
function tileFrom(tiles: HTMLElement[], from: HTMLElement, key: string) {
  const index = tiles.indexOf(from)
  if (key === 'ArrowRight') return tiles[index + 1]
  if (key === 'ArrowLeft') return tiles[index - 1]
  if (key === 'Home') return tiles[0]
  if (key === 'End') return tiles.at(-1)
  const here = from.getBoundingClientRect()
  const down = key === 'ArrowDown'
  const rows = tiles
    .map((tile) => ({ tile, rect: tile.getBoundingClientRect() }))
    .filter(({ rect }) =>
      down ? rect.top >= here.bottom - 1 : rect.bottom <= here.top + 1
    )
  if (rows.length === 0) return undefined
  const rowTop = down
    ? Math.min(...rows.map(({ rect }) => rect.top))
    : Math.max(...rows.map(({ rect }) => rect.top))
  const row = rows.filter(({ rect }) => Math.abs(rect.top - rowTop) < 1)
  return row.reduce((best, next) =>
    Math.abs(centre(next.rect) - centre(here)) <
    Math.abs(centre(best.rect) - centre(here))
      ? next
      : best
  ).tile
}

const ARROWS = new Set(['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'])

/**
 * The preset's blocks as tiles, from the side on a desktop and the bottom on
 * a phone. A tile adds its block after the caret's, and hands focus back.
 * From 1280px wide it leaves the page usable beside it, so the caret can move.
 */
export function EditorBlocksDrawer({
  editor,
  open,
  onOpenChange,
  items,
  ui,
  containers,
  startAt
}: EditorBlocksDrawerProps) {
  const phone = useOnPhone()
  // A wide touch screen still gets the bottom sheet, which takes the page.
  const beside = useWide() && !phone
  const id = useId()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  // A pick hands focus on itself, which closing mustn't take back.
  const pickedRef = useRef(false)
  const gridRef = useRef<HTMLDivElement>(null)
  const filterRef = useRef<HTMLInputElement>(null)
  // State, not a ref: the popup mounts after `open` turns true.
  const [popup, setPopup] = useState<HTMLDivElement | null>(null)

  const shown = rankedInsertItems(namedInsertItems(items, query, ui), query)
  const usable = (item: EditorInsertItem) =>
    editor.can().command(insertion(item, containers))
  // The quickest way to a whole page leads, above the fold of a short screen.
  const groups = sectionsFirst(groupsOf(shown))
  const ordered = groups.flatMap(([, tiles]) => tiles)
  const enabled = ordered.filter(usable)
  const current = Math.min(active, Math.max(enabled.length - 1, 0))

  useEffect(() => {
    if (!open || !beside || !popup) return
    const root = editor.view.dom.closest<HTMLElement>('[data-slot="editor"]')
    return root ? makeRoomBeside(root, popup) : undefined
  }, [editor, open, beside, popup])

  // Closed by a pick, Escape or the toolbar alike, it opens unfiltered.
  useEffect(() => {
    if (open) return
    setQuery('')
    setActive(0)
  }, [open])

  const pick = (item: EditorInsertItem) => {
    pickedRef.current = true
    // Closed first, so the drawer lets go of focus before the block takes it.
    flushSync(() => onOpenChange(false))
    focusEditor(editor)
    editor
      .chain()
      .command(insertion(item, containers))
      .command((props) => item.placed?.(props) ?? true)
      .run()
    if (!item.block) item.insert(editor.chain(), ui).run()
  }

  const tiles = () =>
    [
      ...(gridRef.current?.querySelectorAll<HTMLButtonElement>(
        '[data-slot="editor-blocks-tile"]:not(:disabled)'
      ) ?? [])
    ] as HTMLElement[]

  const onGridKeyDown = (event: KeyboardEvent) => {
    const from = event.target as HTMLElement
    if (ARROWS.has(event.key) || event.key === 'Home' || event.key === 'End') {
      const all = tiles()
      const to = tileFrom(all, from, event.key)
      if (event.key === 'ArrowUp' && !to) filterRef.current?.focus()
      if (!to) return
      event.preventDefault()
      setActive(all.indexOf(to))
      to.focus()
      return
    }
    const typed =
      event.key.length === 1 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    if (typed && event.key !== ' ') {
      event.preventDefault()
      setQuery((typedSoFar) => typedSoFar + event.key)
      setActive(0)
      filterRef.current?.focus()
    }
  }

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      side={phone ? 'bottom' : 'right'}
      modal={!beside}
      disablePointerDismissal={beside}
    >
      <Drawer.Portal>
        {beside ? null : <Drawer.Backdrop />}
        {/* Wide, the viewport lets the page under it take the pointer. */}
        <Drawer.Viewport className={beside ? 'pointer-events-none' : undefined}>
          <Drawer.Popup
            ref={setPopup}
            data-editor-popup=''
            size={phone ? 'fit' : 'sm'}
            className={beside ? 'pointer-events-auto' : undefined}
            initialFocus={() => {
              const all = tiles()
              const start =
                all.find((tile) => tile.dataset.group === startAt) ?? all[0]
              if (start) setActive(all.indexOf(start))
              return start ?? filterRef.current
            }}
            finalFocus={() => {
              if (!pickedRef.current) focusEditor(editor)
              // The toolbar opens it without onOpenChange, so reset here.
              pickedRef.current = false
              return false
            }}
          >
            {phone ? <Drawer.Handle /> : null}
            <Drawer.Header>
              <Drawer.Title>Blocks</Drawer.Title>
              <Drawer.Description>
                Adds a block after the one with the caret.
              </Drawer.Description>
            </Drawer.Header>
            <Drawer.Body className='grid content-start gap-6 pb-6'>
              <Input
                ref={filterRef}
                type='search'
                aria-label='Find a block'
                placeholder='Find a block'
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setActive(0)
                }}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowDown') {
                    event.preventDefault()
                    tiles()[0]?.focus()
                  }
                  if (event.key === 'Enter' && enabled[0]) {
                    event.preventDefault()
                    pick(enabled[0])
                  }
                }}
              />
              <div
                ref={gridRef}
                className='grid content-start gap-6'
                onKeyDown={onGridKeyDown}
              >
                {groups.length === 0 ? (
                  <EmptyState size='sm'>
                    <EmptyState.Title render={<p />}>
                      No blocks match
                    </EmptyState.Title>
                  </EmptyState>
                ) : null}
                {groups.map(([group, groupTiles], groupIndex) => {
                  const headingId = `${id}-group-${groupIndex}`
                  return (
                    <div
                      key={group}
                      role='group'
                      aria-labelledby={headingId}
                      className='grid gap-2'
                    >
                      <h3
                        id={headingId}
                        className='text-display-ui-6 text-subtle'
                      >
                        {group}
                      </h3>
                      <div
                        className={
                          groupTiles.some(({ thumbnail }) => thumbnail)
                            ? 'grid grid-cols-2 gap-2'
                            : 'grid grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] gap-2'
                        }
                      >
                        {groupTiles.map((item, at) => {
                          const Icon = item.icon
                          const disabled = !usable(item)
                          return (
                            <button
                              key={`${at}-${item.label}`}
                              type='button'
                              data-slot='editor-blocks-tile'
                              data-group={group}
                              disabled={disabled}
                              // One tab stop for the tiles; the arrow keys move.
                              tabIndex={
                                !disabled && enabled[current] === item ? 0 : -1
                              }
                              onFocus={() => setActive(enabled.indexOf(item))}
                              onClick={() => pick(item)}
                              className='is-interactive grid justify-items-center gap-2 rounded-xl emphasis-subtler p-3 text-center text-sm text-normal'
                            >
                              {item.thumbnail ? (
                                <img
                                  src={item.thumbnail}
                                  alt=''
                                  width={240}
                                  height={160}
                                  // Its room is kept, and tinted, while it loads.
                                  className='aspect-3/2 h-auto w-full rounded-lg bg-subtle'
                                />
                              ) : (
                                <IconTile size='md' aria-hidden>
                                  <Icon weight='bold' />
                                </IconTile>
                              )}
                              {item.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Drawer.Body>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer>
  )
}
