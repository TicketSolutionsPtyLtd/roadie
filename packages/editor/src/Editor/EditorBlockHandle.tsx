'use client'

import {
  type RefObject,
  createElement,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from 'react'

import {
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowsClockwiseIcon,
  ColumnsIcon,
  CopySimpleIcon,
  DotsSixVerticalIcon,
  type Icon,
  LinkIcon,
  ListBulletsIcon,
  ListNumbersIcon,
  PlusIcon,
  QuotesIcon,
  RectangleIcon,
  SelectionPlusIcon,
  SlidersHorizontalIcon,
  TextHFourIcon,
  TextHIcon,
  TextHThreeIcon,
  TextHTwoIcon,
  TextTIcon,
  TrashIcon
} from '@phosphor-icons/react'
import { closeHistory } from '@tiptap/pm/history'
import { Fragment, type Node as ProseMirrorNode, Slice } from '@tiptap/pm/model'
import {
  type EditorState,
  NodeSelection,
  TextSelection,
  type Transaction
} from '@tiptap/pm/state'
import { type Editor as TiptapEditor, useEditorState } from '@tiptap/react'
import { createPortal } from 'react-dom'

import { Badge } from '@oztix/roadie-components/badge'
import { IconButton } from '@oztix/roadie-components/button'
import { Menu } from '@oztix/roadie-components/menu'
import { cn } from '@oztix/roadie-core/utils'

import { EditorBlockSheet } from './EditorBlockSheet'
import { hideBubbleMenu } from './EditorBubbleMenuEngine'
import { EditorColumnHandle } from './EditorColumnHandle'
import {
  BLOCK_ACTION_KEYS,
  type BlockContainers,
  type BlockKind,
  TEXT_BLOCK_KINDS,
  blockAt,
  blockIdAt,
  blockKind,
  canMoveBlock,
  columnOf,
  deleteBlock,
  duplicateBlock,
  findBlockId,
  insertBelow,
  moveBlock,
  moveBlockTo,
  movePlaces,
  parentBlock,
  turnInto
} from './blockActions'
import { draggedBlocks } from './blockDrag'
import {
  blocksIn,
  canMoveRange,
  deleteRange,
  duplicateRange,
  moveRange,
  selectedBlocks
} from './blockSelection'
import { focusEditor } from './focusEditor'
import { markMenuBlock } from './focusedBlock'
import { useOnPhone } from './toolbarMode'

// A button's width and the gap to the text, in px.
const HANDLE_SIZE = 24
const HANDLE_GAP = 4
// Wider on a phone, so the grip's 44px target ends at the text.
const PHONE_HANDLE_GAP = 6
const GUTTER = HANDLE_SIZE * 2 + HANDLE_GAP

const HEADING_ICONS: Record<number, Icon> = {
  2: TextHTwoIcon,
  3: TextHThreeIcon,
  4: TextHFourIcon
}

const KIND_NAMES = {
  paragraph: ['Paragraph', TextTIcon],
  bulletList: ['Bulleted list', ListBulletsIcon],
  orderedList: ['Numbered list', ListNumbersIcon],
  blockquote: ['Quote', QuotesIcon]
} as const satisfies Record<string, readonly [string, Icon]>

const kindLabel = (kind: BlockKind) =>
  kind.type === 'heading' ? `Heading ${kind.level}` : KIND_NAMES[kind.type][0]

const kindIcon = (kind: BlockKind): Icon =>
  kind.type === 'heading'
    ? (HEADING_ICONS[kind.level] ?? TextHTwoIcon)
    : KIND_NAMES[kind.type][1]

function blockLink(blockId: string) {
  const url = new URL(window.location.href)
  url.hash = blockId
  return url.href
}

// A hash the page holds for something else may not decode.
function hashId() {
  try {
    return decodeURIComponent(window.location.hash.slice(1))
  } catch {
    return ''
  }
}

function useScrollToLinkedBlock(editor: TiptapEditor) {
  useEffect(() => {
    const id = hashId()
    if (!id) return
    const scroll = () => {
      const pos = findBlockId(editor.state.doc, id)
      const dom = pos === null ? null : editor.view.nodeDOM(pos)
      if (dom instanceof HTMLElement) dom.scrollIntoView({ block: 'center' })
    }
    if (editor.isInitialized) scroll()
    editor.on('create', scroll)
    return () => {
      editor.off('create', scroll)
    }
  }, [editor])
}

/**
 * A box of the handle's own in the editor's content wrapper, once Tiptap has
 * mounted its view there, so the grip is placed against the wrapper. Tiptap
 * moves the wrapper's children when it unmounts, so React never owns them
 * directly.
 */
function useHandleHost(editor: TiptapEditor) {
  const [host, setHost] = useState<HTMLElement | null>(null)
  useEffect(() => {
    const box = document.createElement('div')
    box.dataset.slot = 'editor-block-handle-host'
    // As a grid item it would take a share of a tall wrapper from the text.
    box.style.display = 'contents'
    // Tiptap emits create just before it sets isInitialized.
    const mount = () => {
      editor.view.dom.parentElement?.append(box)
      setHost(box)
    }
    if (editor.isInitialized) mount()
    editor.on('create', mount)
    return () => {
      editor.off('create', mount)
      box.remove()
    }
  }, [editor])
  return host
}

// The text's, not a block's, as every grip sits in the same gutter.
const isRtl = (editor: TiptapEditor) =>
  getComputedStyle(editor.view.dom).direction === 'rtl'

// The block under the pointer, read inside the text's edges so the gutter
// beside a top-level block counts too.
function blockAtPointer(
  editor: TiptapEditor,
  event: MouseEvent,
  containers: BlockContainers
) {
  const { view } = editor
  const box = view.dom.getBoundingClientRect()
  const style = getComputedStyle(view.dom)
  const start = box.left + (parseFloat(style.paddingLeft) || 0) + 1
  const end = box.right - (parseFloat(style.paddingRight) || 0) - 1
  const left = Math.min(Math.max(event.clientX, start), end)
  const hit = view.posAtCoords({ left, top: event.clientY })
  if (!hit) return null
  return blockAt(view.state, hit.inside >= 0 ? hit.inside : hit.pos, containers)
}

// The gutter between a nested block and its handle crosses its container's
// padding, which would otherwise hand the handle to the container.
function inGutterOf(editor: TiptapEditor, pos: number, event: MouseEvent) {
  const dom = editor.view.nodeDOM(pos)
  if (!(dom instanceof HTMLElement)) return false
  const box = dom.getBoundingClientRect()
  return (
    event.clientY >= box.top &&
    event.clientY <= box.bottom &&
    (isRtl(editor)
      ? event.clientX > box.right && event.clientX <= box.right + GUTTER
      : event.clientX < box.left && event.clientX >= box.left - GUTTER)
  )
}

const isNode = (target: EventTarget | null): target is Node =>
  target !== null && 'nodeType' in target

/**
 * Over the text or the grip, or over the gutter before the wrapper where a
 * subtler editor's grip sits. Not over anything else in the wrapper, such as
 * the bubble menu, nor over what covers the editor or sits beside it.
 */
function inReach(
  editor: TiptapEditor,
  host: HTMLElement,
  { target, clientX, clientY }: MouseEvent
) {
  if (!isNode(target)) return false
  if (editor.view.dom.contains(target) || host.contains(target)) return true
  const wrapper = host.parentElement
  if (!wrapper || !target.contains(wrapper)) return false
  const { left, right, top, bottom } = wrapper.getBoundingClientRect()
  const reach = GUTTER
  const [from, to] = isRtl(editor)
    ? [left, right + reach]
    : [left - reach, right]
  return clientX >= from && clientX <= to && clientY >= top && clientY <= bottom
}

// Its first line, below any padding a section has: the first block down its
// first children, text or not.
function firstLineOf(editor: TiptapEditor, pos: number, dom: HTMLElement) {
  let node = editor.state.doc.nodeAt(pos)
  let at = pos
  while (node && !node.isTextblock && !node.isAtom && node.firstChild) {
    at += 1
    node = node.firstChild
  }
  const line = at === pos ? null : editor.view.nodeDOM(at)
  return line instanceof HTMLElement ? line : dom
}

// Centred on the block's first line, just before its start edge.
function placeAt(
  editor: TiptapEditor,
  wrapper: HTMLElement,
  pos: number,
  gap: number
) {
  const dom = editor.view.nodeDOM(pos)
  if (!(dom instanceof HTMLElement)) return null
  const box = dom.getBoundingClientRect()
  const frame = wrapper.getBoundingClientRect()
  const text = firstLineOf(editor, pos, dom)
  const textBox = text === dom ? box : text.getBoundingClientRect()
  const line = parseFloat(getComputedStyle(text).lineHeight) || textBox.height
  return {
    top:
      textBox.top -
      frame.top +
      (Math.min(line, textBox.height) - HANDLE_SIZE) / 2,
    left: isRtl(editor)
      ? box.right - frame.left + gap
      : box.left - frame.left - HANDLE_SIZE - gap
  }
}

/**
 * Opens the insert menu after the block at `pos`, on a new line, or on the
 * block itself when it's an empty line, by typing the `/` that opens it.
 */
function addAfter(editor: TiptapEditor, pos: number) {
  const { state } = editor
  const node = state.doc.nodeAt(pos)
  if (!node) return
  const emptyLine = node.type.name === 'paragraph' && node.content.size === 0
  const { paragraph } = state.schema.nodes
  const tr = emptyLine
    ? state.tr.insertText('/', pos + 1)
    : state.tr.insert(
        pos + node.nodeSize,
        paragraph!.create(null, state.schema.text('/'))
      )
  const caret = emptyLine ? pos + 2 : pos + node.nodeSize + 2
  editor.view.dispatch(
    closeHistory(tr.setSelection(TextSelection.create(tr.doc, caret)))
  )
  focusEditor(editor)
}

// A moved node is inserted as itself, so the selection's ancestors hold it.
function landedAt(state: EditorState, moved: ProseMirrorNode | null) {
  if (!moved) return null
  const { selection } = state
  if (selection instanceof NodeSelection && selection.node === moved) {
    return selection.from
  }
  const { $from } = selection
  for (let depth = $from.depth; depth > 0; depth--) {
    if ($from.node(depth) === moved) return $from.before(depth)
  }
  return null
}

// The menu's width and a margin, which the grip must have before it.
const MENU_ROOM = 240

function roomBeside(
  editor: TiptapEditor,
  wrapper: HTMLElement,
  place: { left: number }
) {
  const grip = wrapper.getBoundingClientRect().left + place.left
  const room = isRtl(editor)
    ? document.documentElement.clientWidth - grip - HANDLE_SIZE
    : grip
  return room >= MENU_ROOM
}

const PARENT_LABELS: Record<string, string> = {
  section: 'Select section',
  columns: 'Select columns'
}

const BLOCK_LABELS: Record<string, string> = {
  paragraph: 'Paragraph',
  bulletList: 'Bulleted list',
  orderedList: 'Numbered list',
  blockquote: 'Quote',
  codeBlock: 'Code',
  horizontalRule: 'Divider',
  image: 'Image',
  embed: 'Embed',
  table: 'Table',
  section: 'Section',
  columns: 'Columns',
  column: 'Column',
  button: 'Button',
  spacer: 'Spacer'
}

function blockLabel(
  node: ProseMirrorNode,
  appLabels: Readonly<Record<string, string>>
) {
  if (node.type.name === 'heading') return `Heading ${node.attrs.level}`
  const { name } = node.type
  return appLabels[name] ?? BLOCK_LABELS[name] ?? 'Block'
}

type EditorBlockHandleProps = {
  editor: TiptapEditor
  /** Set while mounted, so Mod+/ opens the caret block's menu. */
  openMenuRef: RefObject<(() => void) | null>
  /** The nodes whose children each get a handle. */
  containers: BlockContainers
  /** Shows an add button that opens the insert menu after the block. */
  canAdd?: boolean
  /** An app's blocks' names, by node name, to head their menus. */
  appLabels?: Readonly<Record<string, string>>
  /** Whether a block, by node name, has settings, which its menu leads with. */
  hasSettings?: (name: string) => boolean
  /** Opens the settings of the block at `pos`. */
  onSettings?: (pos: number) => void
}

/**
 * A grip beside the hovered block, or the caret's while the editor has focus.
 * Dragging it moves the block, and its menu moves, copies or deletes it.
 */
export function EditorBlockHandle({
  editor,
  openMenuRef,
  containers,
  canAdd = false,
  appLabels = {},
  hasSettings,
  onSettings
}: EditorBlockHandleProps) {
  const host = useHandleHost(editor)
  const phone = useOnPhone()
  // Where the copied block's grip was, as the grip moves on once the menu closes.
  const [copied, setCopied] = useState<{
    top: number
    left: number
    at: number
  } | null>(null)
  useScrollToLinkedBlock(editor)
  const wrapper = host?.parentElement ?? null
  const [hovered, setHovered] = useState<number | null>(null)
  const [menuAt, setMenuAt] = useState<number | null>(null)
  const [columnMenuAt, setColumnMenuAt] = useState<number | null>(null)
  const [place, setPlace] = useState<{ top: number; left: number } | null>(null)
  const { caretBlock, doc } = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      caretBlock:
        current.isEditable && current.isFocused
          ? blockAt(current.state, current.state.selection.from, containers)
          : null,
      doc: current.state.doc
    }),
    equalityFn: (a, b) => a.caretBlock === b?.caretBlock && a.doc === b?.doc
  })
  const editable = useEditorState({
    editor,
    selector: ({ editor: current }) => current.isEditable
  })
  const range = useEditorState({
    editor,
    selector: ({ editor: current }) =>
      selectedBlocks(current.state, containers),
    equalityFn: (a, b) => a?.from === b?.from && a?.to === b?.to
  })
  // After a tap, as the hover a tap leaves would outstay the caret's block.
  const [touched, setTouched] = useState(false)
  const shown =
    menuAt ?? (touched ? (caretBlock ?? hovered) : (hovered ?? caretBlock))
  const shownRef = useRef(shown)
  useLayoutEffect(() => {
    shownRef.current = shown
  })
  // Read by each move before `hovered` renders, so it's mapped through edits too.
  const pointerBlock = useRef<number | null>(null)
  const afterClose = useRef<(() => void) | null>(null)

  // On the page, as a subtler editor's grip hangs outside the wrapper, and
  // leaving the wrapper for the gap would hide it.
  useEffect(() => {
    if (!host) return
    const page = host.ownerDocument
    // On the handle, its block stays, even once the editor loses focus: on
    // touch that's the caret's block, with no hover before the tap.
    const pin = () => {
      pointerBlock.current = shownRef.current
      setHovered(pointerBlock.current)
    }
    const onMove = (event: MouseEvent) => {
      if (host.contains(event.target as Node)) {
        pin()
        return
      }
      const current = pointerBlock.current
      if (!inReach(editor, host, event)) {
        pointerBlock.current = null
      } else {
        const keep = current != null && inGutterOf(editor, current, event)
        if (!keep)
          pointerBlock.current = blockAtPointer(editor, event, containers)
      }
      setHovered(pointerBlock.current)
    }
    const onOut = ({ relatedTarget }: MouseEvent) => {
      if (relatedTarget) return
      pointerBlock.current = null
      setHovered(null)
    }
    const onPress = ({ pointerType }: PointerEvent) =>
      setTouched(pointerType === 'touch')
    page.addEventListener('pointerdown', onPress, true)
    page.addEventListener('mousemove', onMove)
    page.addEventListener('mouseout', onOut)
    host.addEventListener('pointerdown', pin)
    return () => {
      page.removeEventListener('pointerdown', onPress, true)
      page.removeEventListener('mousemove', onMove)
      page.removeEventListener('mouseout', onOut)
      host.removeEventListener('pointerdown', pin)
    }
  }, [editor, host, containers])

  useEffect(() => {
    if (!editable) setMenuAt(null)
  }, [editable])

  // Long enough to read, as the menu that copied it has closed.
  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(null), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  // Mounted throughout, as a live region added with its text goes unread.
  const status = host
    ? createPortal(
        <span role='status' className='sr-only'>
          {copied ? 'Link copied' : ''}
        </span>,
        host
      )
    : null

  // Its blur check counts focus on the grip as staying in the editor.
  const menuOpen = menuAt !== null
  const menuAtRef = useRef(menuAt)
  useLayoutEffect(() => {
    menuAtRef.current = menuAt
  })
  useEffect(() => {
    if (menuOpen) hideBubbleMenu(editor)
  }, [editor, menuOpen])

  // Opened from Mod+/, the first action is ready for Enter, as a menu opened
  // from its trigger's keys has it.
  const fromKeys = useRef(false)
  const popupRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!menuOpen || !fromKeys.current) return
    fromKeys.current = false
    const frame = requestAnimationFrame(() =>
      popupRef.current
        ?.querySelector<HTMLElement>(
          '[role^="menuitem"]:not([aria-disabled="true"])'
        )
        ?.focus()
    )
    return () => cancelAnimationFrame(frame)
  }, [menuOpen])

  useEffect(() => {
    const follow = ({ transaction }: { transaction: Transaction }) => {
      if (!transaction.docChanged) return
      const map = (pos: number | null) => {
        if (pos == null) return pos
        const mapped = transaction.mapping.mapResult(pos)
        return mapped.deleted ? null : mapped.pos
      }
      pointerBlock.current = map(pointerBlock.current)
      setHovered(map)
      setMenuAt(map)
      setColumnMenuAt(map)
    }
    editor.on('transaction', follow)
    return () => {
      editor.off('transaction', follow)
    }
  }, [editor])

  useEffect(() => {
    openMenuRef.current = () => {
      const { from } = editor.state.selection
      const block = blockAt(editor.state, from, containers)
      // Only an opening focuses its first action, not a menu already open.
      fromKeys.current = block !== null && menuAtRef.current === null
      setMenuAt(block)
    }
    return () => {
      openMenuRef.current = null
    }
  }, [editor, openMenuRef, containers])

  // The menu acts on every selected block when it's open on one of them.
  // One selected block is that block, with its own menu.
  const blocks =
    range &&
    range.count > 1 &&
    shown != null &&
    shown >= range.from &&
    shown < range.to
      ? range
      : null
  const marked = menuAt === null ? null : (blocks ?? menuAt)
  useEffect(() => {
    markMenuBlock(
      editor.view,
      marked === null || typeof marked === 'number' ? marked : marked.from,
      marked !== null && typeof marked === 'object' ? marked.to : undefined
    )
  }, [editor, marked])

  // After every change, as text above or in the block moves it, and as the
  // editor or its frame resizes, as a drawer opening beside it reflows its
  // text or moves a centred email that keeps its width.
  const [resized, setResized] = useState(0)
  useEffect(() => {
    const observer = new ResizeObserver(() => setResized((count) => count + 1))
    observer.observe(editor.view.dom)
    if (wrapper) observer.observe(wrapper)
    return () => observer.disconnect()
  }, [editor, wrapper])
  useLayoutEffect(() => {
    // In a column after another, side by side, the grip fills the gap
    // before it, clear of the column to its left. A first column's text, and
    // a phone's stacked columns, start where body text does.
    const column = shown == null ? null : columnOf(doc, shown)
    const afterAnother = column !== null && doc.resolve(column).index() > 0
    const gap = phone ? PHONE_HANDLE_GAP : afterAnother ? 0 : HANDLE_GAP
    setPlace(
      wrapper && shown != null ? placeAt(editor, wrapper, shown, gap) : null
    )
  }, [editor, wrapper, shown, doc, phone, resized])

  const columnHandle = (column: number | null) =>
    wrapper && containers.has('column') ? (
      <EditorColumnHandle
        editor={editor}
        wrapper={wrapper}
        column={column}
        menuAt={columnMenuAt}
        onMenuAtChange={setColumnMenuAt}
      />
    ) : null

  if (!wrapper || !editable || shown == null || !place) {
    // A moved column takes its block's grip with it, but keeps its menu.
    return (
      <>
        {status}
        {editable && host && columnMenuAt !== null
          ? createPortal(columnHandle(null), host)
          : null}
      </>
    )
  }

  const parent = parentBlock(editor.state, shown, containers)
  const parentName = parent === null ? null : doc.nodeAt(parent)!.type.name

  const run = (action: (pos: number) => Transaction | null) => {
    const tr = action(shown)
    // Its own undo step, even straight after the last.
    if (tr) editor.view.dispatch(closeHistory(tr))
  }

  // The menu stays open on the block where it lands, a section included.
  const move = (step: -1 | 1) => {
    const moved = editor.state.doc.nodeAt(shown)
    run((pos) =>
      blocks
        ? moveRange(editor.state, blocks, step)
        : moveBlock(editor.state, pos, step, containers)
    )
    setMenuAt(
      landedAt(editor.state, moved) ??
        blockAt(editor.state, editor.state.selection.from, containers)
    )
  }

  const handBack = () => {
    focusEditor(editor)
    afterClose.current?.()
    afterClose.current = null
    return false
  }

  const onDragStart = (event: React.DragEvent) => {
    const { view } = editor
    const dom = view.nodeDOM(shown)
    const node = view.state.doc.nodeAt(shown)!
    view.dispatch(
      view.state.tr.setSelection(NodeSelection.create(view.state.doc, shown))
    )
    // Closed, so a nested block drops as itself rather than with its parents.
    const slice = new Slice(Fragment.from(node), 0, 0)
    const { dom: html, text } = view.serializeForClipboard(slice)
    event.dataTransfer.clearData()
    event.dataTransfer.setData('text/html', html.innerHTML)
    event.dataTransfer.setData('text/plain', text)
    event.dataTransfer.effectAllowed = 'move'
    if (dom instanceof HTMLElement) event.dataTransfer.setDragImage(dom, 0, 0)
    view.dragging = { slice, move: true }
    draggedBlocks.set(view, { from: shown, containers })
  }

  const end = blocks ? blocks.to : shown + doc.nodeAt(shown)!.nodeSize
  const label = blocks
    ? `${blocks.count} blocks`
    : blockLabel(doc.nodeAt(shown)!, appLabels)
  const shownKinds = blocksIn(doc, blocks?.from ?? shown, end).map(({ pos }) =>
    blockKind(doc, pos)
  )
  const kind = shownKinds.every(
    (each) => each && kindLabel(each) === kindLabel(shownKinds[0]!)
  )
    ? (shownKinds[0] ?? null)
    : null
  const kinds = shownKinds.every(Boolean)
    ? TEXT_BLOCK_KINDS.filter(({ type }) => Boolean(editor.schema.nodes[type]))
    : []
  const blockId = blocks ? null : blockIdAt(doc, shown)
  const close = () => setMenuAt(null)

  const settings: BlockAction[] =
    !blocks && onSettings && hasSettings?.(doc.nodeAt(shown)!.type.name)
      ? [
          {
            label: 'Settings',
            icon: SlidersHorizontalIcon,
            // Once the menu's handed focus back, or it would close them.
            run: () => {
              const at = shown
              afterClose.current = () => onSettings(at)
            }
          }
        ]
      : []
  const moves: BlockAction[] = [
    {
      label: 'Move up',
      icon: ArrowUpIcon,
      shortcut: BLOCK_ACTION_KEYS.moveUp,
      disabled: blocks
        ? !canMoveRange(doc, blocks, -1)
        : !canMoveBlock(doc, shown, -1, containers),
      // Stays open on the block, so it can go up again.
      keepOpen: true,
      run: () => move(-1)
    },
    {
      label: 'Move down',
      icon: ArrowDownIcon,
      shortcut: BLOCK_ACTION_KEYS.moveDown,
      disabled: blocks
        ? !canMoveRange(doc, blocks, 1)
        : !canMoveBlock(doc, shown, 1, containers),
      keepOpen: true,
      run: () => move(1)
    },
    ...(parent !== null && !blocks
      ? [
          {
            label: PARENT_LABELS[parentName!] ?? 'Select parent block',
            icon: SelectionPlusIcon,
            // Stays open on the parent, the keyboard's way to a section.
            keepOpen: true,
            run: () => setMenuAt(parent)
          }
        ]
      : []),
    {
      label: 'Duplicate',
      icon: CopySimpleIcon,
      shortcut: BLOCK_ACTION_KEYS.duplicate,
      run: () =>
        run((pos) =>
          blocks
            ? duplicateRange(editor.state, blocks)
            : duplicateBlock(editor.state, pos)
        )
    }
  ]
  const column = blocks ? null : columnOf(doc, shown)
  const more: BlockAction[] = [
    ...(column !== null
      ? [
          {
            label: 'Column actions',
            icon: ColumnsIcon,
            // The keyboard's way to the column's grip, which takes no Tab stop.
            run: () => {
              afterClose.current = () => setColumnMenuAt(column)
            }
          }
        ]
      : []),
    {
      label: 'Insert below',
      icon: PlusIcon,
      // Once the menu's let go of focus, or the insert menu would close.
      run: () => {
        // An empty line takes the `/` itself, as the add button's does.
        afterClose.current = () =>
          blocks
            ? run(() => insertBelow(editor.state, end))
            : addAfter(editor, shown)
      }
    },
    ...(blockId
      ? [
          {
            label: 'Copy link to block',
            icon: LinkIcon,
            run: () =>
              void navigator.clipboard
                ?.writeText(blockLink(blockId))
                .then(() =>
                  setCopied({
                    top: place.top - HANDLE_SIZE,
                    left: place.left,
                    at: Date.now()
                  })
                )
                // A refused copy changes nothing on the page, so it's let go.
                .catch(() => {})
          }
        ]
      : [])
  ]
  const remove: BlockAction = {
    label: 'Delete',
    icon: TrashIcon,
    shortcut: BLOCK_ACTION_KEYS.delete,
    intent: 'danger',
    run: () =>
      run((pos) =>
        blocks
          ? deleteRange(editor.state, blocks)
          : deleteBlock(editor.state, pos)
      )
  }
  const turn = (to: BlockKind) => {
    editor
      .chain()
      .command(turnInto(blocks?.from ?? shown, to, end))
      .run()
    focusEditor(editor)
  }

  const grip = (
    <IconButton
      size='xs'
      emphasis='subtler'
      aria-label='Block actions'
      draggable
      // It shows only beside the caret's block, so focus on it would
      // hide it; Mod+/ is the keyboard path.
      tabIndex={-1}
      data-slot='editor-block-handle'
      className={cn(
        'absolute cursor-grab text-subtle',
        // A thumb's 44px target, where a phone has no hover to find it.
        'max-sm:before:absolute max-sm:before:top-1/2 max-sm:before:left-1/2 max-sm:before:size-11 max-sm:before:-translate-1/2',
        'pointer-coarse:before:absolute pointer-coarse:before:top-1/2 pointer-coarse:before:left-1/2 pointer-coarse:before:size-11 pointer-coarse:before:-translate-1/2'
      )}
      style={place}
      onClick={() => setMenuAt(shown)}
      onDragStart={onDragStart}
      onDragEnd={() => {
        editor.view.dragging = null
        draggedBlocks.delete(editor.view)
      }}
    >
      <DotsSixVerticalIcon weight='bold' className='size-4' aria-hidden />
    </IconButton>
  )

  return (
    <>
      {status}
      {createPortal(
        <>
          {copied ? (
            <Badge
              aria-hidden
              intent='success'
              emphasis='subtle'
              size='sm'
              className='absolute'
              style={{ top: copied.top, left: copied.left }}
            >
              Link copied
            </Badge>
          ) : null}
          {columnHandle(columnOf(doc, shown))}
          {canAdd && columnOf(doc, shown) === null ? (
            <IconButton
              size='xs'
              emphasis='subtler'
              aria-label='Add block'
              // As the grip: Mod+/ and `/` are the keyboard paths.
              tabIndex={-1}
              data-slot='editor-block-add'
              // A phone adds from the toolbar and the block's menu, leaving the
              // gutter to the grip.
              className='absolute text-subtle max-sm:hidden pointer-coarse:hidden'
              style={{
                top: place.top,
                left: place.left + (isRtl(editor) ? HANDLE_SIZE : -HANDLE_SIZE)
              }}
              onClick={() => addAfter(editor, shown)}
            >
              <PlusIcon weight='bold' className='size-4' aria-hidden />
            </IconButton>
          ) : null}
          {phone ? (
            <>
              {grip}
              <EditorBlockSheet
                open={menuOpen}
                onClose={close}
                onFinalFocus={handBack}
                label={label}
                block={
                  menuOpen
                    ? (editor.view.nodeDOM(shown) as HTMLElement | null)
                    : null
                }
                moveUp={moves[0]!}
                moveDown={moves[1]!}
                actions={[...settings, ...moves.slice(2), ...more]}
                remove={remove}
                kinds={kinds.map((each) => ({
                  label: kindLabel(each),
                  icon: kindIcon(each),
                  chosen: kind !== null && kindLabel(each) === kindLabel(kind),
                  run: () => turn(each)
                }))}
                places={(menuOpen && !blocks
                  ? movePlaces(doc, shown, containers)
                  : []
                ).map((place) => ({
                  label: place.label,
                  icon: place.kind === 'heading' ? TextHIcon : RectangleIcon,
                  chosen: false,
                  run: () =>
                    run((pos) => moveBlockTo(editor.state, pos, place.to))
                }))}
              />
            </>
          ) : (
            <Menu
              open={menuOpen}
              onOpenChange={(open) => {
                if (!open) close()
              }}
            >
              <Menu.Trigger render={grip} />
              <Menu.Content
                ref={popupRef}
                // Beside the grip, as Notion's is, so the block stays in view,
                // or below it where the page has no room beside it.
                side={
                  roomBeside(editor, wrapper, place)
                    ? isRtl(editor)
                      ? 'right'
                      : 'left'
                    : 'bottom'
                }
                align='start'
                // Delete acts on the block, as the menu's open on it.
                onKeyDown={(event) => {
                  if (event.key !== 'Delete' && event.key !== 'Backspace')
                    return
                  event.preventDefault()
                  remove.run()
                  close()
                }}
                finalFocus={handBack}
              >
                <Menu.Group>
                  <Menu.GroupLabel>{label}</Menu.GroupLabel>
                  {[...settings, ...moves].map((action) => (
                    <Menu.Item
                      key={action.label}
                      icon={createElement(action.icon, { weight: 'bold' })}
                      shortcut={action.shortcut}
                      disabled={action.disabled}
                      closeOnClick={!action.keepOpen}
                      onClick={action.run}
                    >
                      {action.label}
                    </Menu.Item>
                  ))}
                  {kinds.length > 0 ? (
                    <Menu.SubmenuRoot>
                      <Menu.SubmenuTrigger
                        icon={<ArrowsClockwiseIcon weight='bold' />}
                      >
                        Turn into
                      </Menu.SubmenuTrigger>
                      <Menu.Content>
                        <Menu.RadioGroup value={kind ? kindLabel(kind) : null}>
                          {kinds.map((each) => (
                            <Menu.RadioItem
                              key={kindLabel(each)}
                              value={kindLabel(each)}
                              icon={createElement(kindIcon(each), {
                                weight: 'bold'
                              })}
                              closeOnClick
                              onClick={() => turn(each)}
                            >
                              {kindLabel(each)}
                            </Menu.RadioItem>
                          ))}
                        </Menu.RadioGroup>
                      </Menu.Content>
                    </Menu.SubmenuRoot>
                  ) : null}
                  {more.map((action) => (
                    <Menu.Item
                      key={action.label}
                      icon={createElement(action.icon, { weight: 'bold' })}
                      shortcut={action.shortcut}
                      disabled={action.disabled}
                      closeOnClick={!action.keepOpen}
                      onClick={action.run}
                    >
                      {action.label}
                    </Menu.Item>
                  ))}
                  <Menu.Separator />
                  <Menu.Item
                    icon={<TrashIcon weight='bold' />}
                    shortcut={remove.shortcut}
                    intent='danger'
                    onClick={remove.run}
                  >
                    {remove.label}
                  </Menu.Item>
                </Menu.Group>
              </Menu.Content>
            </Menu>
          )}
        </>,
        host!
      )}
    </>
  )
}

type BlockAction = {
  label: string
  icon: Icon
  shortcut?: readonly string[]
  disabled?: boolean
  intent?: 'danger'
  /** Leaves the menu open, on the block wherever it went. */
  keepOpen?: boolean
  run: () => void
}
