'use client'

import {
  type RefObject,
  use,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from 'react'

import {
  CaretDownIcon,
  DotsThreeIcon,
  PlusIcon,
  PushPinSlashIcon
} from '@phosphor-icons/react'
import { NodeSelection, type Transaction } from '@tiptap/pm/state'
import { type Editor as TiptapEditor, useEditorState } from '@tiptap/react'

import { Menu } from '@oztix/roadie-components/menu'
import { Toolbar } from '@oztix/roadie-components/toolbar'
import { Tooltip } from '@oztix/roadie-components/tooltip'
import { cn } from '@oztix/roadie-core/utils'

import { EditorContext, type EditorContextValue } from './EditorContext'
import type { EditorToolbarProps } from './EditorToolbar'
import {
  type EditorBlockMenu,
  type EditorChoiceGroup,
  type EditorControl,
  type EditorControlUi,
  type EditorToolbarItem,
  SEPARATOR,
  ariaKeyShortcuts,
  blockSettings,
  floatingControls,
  link,
  presetControls,
  preview,
  redo,
  undo
} from './controls'
import { focusEditor, useEditorFinalFocus } from './focusEditor'
import { useShowsShortcuts } from './menuGroups'
import { type ToolbarSlot, fitToolbar } from './toolbarFit'
import {
  EDITOR_POPUP,
  useKeyboardDock,
  useOnPhone,
  useStickyTop
} from './toolbarMode'
import { EDITOR_DOCKED_BAR, EDITOR_TOOLBAR_SIZE } from './variants'

export type ControlState = {
  pressed: boolean
  enabled: boolean
  current?: string
  /** A choice group's own controls. */
  choices?: readonly ControlState[]
}

export function stateOf(
  item: EditorToolbarItem,
  editor: TiptapEditor
): ControlState | undefined {
  if (item === SEPARATOR) return undefined
  if (!('kind' in item)) {
    return {
      pressed: item.pressed?.(editor) ?? false,
      enabled: editor.isEditable && (item.enabled?.(editor) ?? true)
    }
  }
  if (item.kind === 'choice') {
    const choices = item.controls.map(
      (control) => stateOf(control, editor) as ControlState
    )
    return {
      pressed: false,
      enabled: editor.isEditable,
      current: item.controls.find((_, index) => choices[index]?.pressed)?.label,
      choices
    }
  }
  const current = item.types.find((type) => type.active(editor))
  return {
    pressed: false,
    enabled: editor.isEditable,
    current: current?.label ?? item.fallback?.(editor) ?? item.types[0]?.label
  }
}

type BlockMenuProps = {
  menu: EditorBlockMenu
  state: ControlState | undefined
  editor: TiptapEditor | null
  onOpenChange?: (open: boolean) => void
  /** Heads its choices with its label, where the trigger shows only the choice. */
  headed?: boolean
}

type BlockMenuRadioGroupProps = {
  menu: EditorBlockMenu
  state: ControlState | undefined
  editor: TiptapEditor | null
  /** Heads the group, in a menu that holds others. */
  label?: string
}

/** A block menu's choices, with the current one checked. */
export function BlockMenuRadioGroup({
  menu,
  state,
  editor,
  label
}: BlockMenuRadioGroupProps) {
  const current = state?.current ?? menu.types[0]?.label
  const showsShortcuts = useShowsShortcuts()
  return (
    <Menu.RadioGroup
      value={current}
      onValueChange={(chosen) => {
        const type = menu.types.find((option) => option.label === chosen)
        if (editor && type) type.run(editor)
      }}
    >
      {label ? <Menu.GroupLabel>{label}</Menu.GroupLabel> : null}
      {menu.types.map((type) => (
        <Menu.RadioItem
          key={type.label}
          value={type.label}
          shortcut={showsShortcuts ? type.shortcut : undefined}
          disabled={state ? !state.enabled : false}
          closeOnClick
        >
          {type.label}
        </Menu.RadioItem>
      ))}
    </Menu.RadioGroup>
  )
}

export function BlockMenu({
  menu,
  state,
  editor,
  onOpenChange,
  headed = false
}: BlockMenuProps) {
  const current = state?.current ?? menu.types[0]?.label
  const { triggerRef, popupRef, finalFocus } = useEditorFinalFocus(editor)
  return (
    <Menu onOpenChange={onOpenChange}>
      <Menu.Trigger
        ref={triggerRef}
        render={
          <Toolbar.Button
            disabled={!state?.enabled}
            aria-label={`${menu.label}: ${current}`}
          >
            {current}
            <CaretDownIcon weight='bold' className='size-4' aria-hidden />
          </Toolbar.Button>
        }
      />
      <Menu.Content
        ref={popupRef}
        {...{ [EDITOR_POPUP]: '' }}
        finalFocus={finalFocus}
      >
        <BlockMenuRadioGroup
          menu={menu}
          state={state}
          editor={editor}
          label={headed ? menu.label : undefined}
        />
      </Menu.Content>
    </Menu>
  )
}

type ControlProps = {
  control: EditorControl
  state: ControlState | undefined
  editor: TiptapEditor | null
  ui: EditorControlUi
  /** Its value in a choice group, which presses it and runs it instead. */
  choice?: string
}

export function Control({ control, state, editor, ui, choice }: ControlProps) {
  const { label, icon: Icon, shortcut } = control
  const run = () => {
    if (!editor) return
    // The click focused the button, and the command's own focus waits a frame.
    focusEditor(editor)
    control.run(editor, ui)
  }
  const shared = {
    'aria-label': label,
    'aria-keyshortcuts': shortcut && ariaKeyShortcuts(shortcut),
    disabled: !state?.enabled,
    children: <Icon weight='bold' className='size-4' aria-hidden />
  }
  return (
    <Tooltip>
      <Tooltip.Trigger
        render={
          choice !== undefined ? (
            <Toolbar.Toggle {...shared} value={choice} />
          ) : control.pressed ? (
            <Toolbar.Toggle
              {...shared}
              pressed={state?.pressed ?? false}
              onPressedChange={run}
            />
          ) : (
            <Toolbar.Button {...shared} onClick={run} />
          )
        }
      />
      <Tooltip.Content shortcut={shortcut}>{label}</Tooltip.Content>
    </Tooltip>
  )
}

type ChoiceGroupProps = {
  group: EditorChoiceGroup
  state: ControlState | undefined
  editor: TiptapEditor | null
  ui: EditorControlUi
}

/**
 * One `Toolbar.ToggleGroup`, so its fill slides to the control chosen. Pressing
 * the chosen one again runs it to turn it off.
 */
export function ChoiceGroup({ group, state, editor, ui }: ChoiceGroupProps) {
  const current = state?.current
  return (
    <Toolbar.ToggleGroup
      aria-label={group.label}
      value={current ? [current] : []}
      onValueChange={(next) => {
        const chosen = next[0] ?? current
        const control = group.controls.find((item) => item.label === chosen)
        if (!editor || !control) return
        focusEditor(editor)
        control.run(editor, ui)
      }}
    >
      {group.controls.map((control, index) => (
        <Control
          key={control.label}
          control={control}
          state={state?.choices?.[index]}
          editor={editor}
          ui={ui}
          choice={control.label}
        />
      ))}
    </Toolbar.ToggleGroup>
  )
}

type BlocksButtonProps = {
  openBlocks: (() => void) | undefined
  disabled?: boolean
  /** Which side of the button its separator goes. */
  separator: 'before' | 'after'
}

/** Opens the Blocks drawer, in a preset that has one. */
export function BlocksButton({
  openBlocks,
  disabled,
  separator
}: BlocksButtonProps) {
  if (!openBlocks) return null
  return (
    <>
      {separator === 'before' ? <Toolbar.Separator /> : null}
      <Toolbar.Button disabled={disabled} onClick={openBlocks}>
        <PlusIcon weight='bold' className='size-4' aria-hidden />
        Blocks
      </Toolbar.Button>
      {separator === 'after' ? <Toolbar.Separator /> : null}
    </>
  )
}

/** What the controls open in the editor's own UI, from its context. */
export function controlUi(context: EditorContextValue): EditorControlUi {
  const {
    editLink,
    editAlt,
    editEmbed,
    pickImage,
    replaceImage,
    editButton,
    editVariable,
    importSource,
    openPreview
  } = context
  return {
    editLink,
    editAlt,
    editEmbed,
    pickImage,
    replaceImage,
    editButton,
    editVariable,
    importSource,
    preview: openPreview
  }
}

function withoutStraySeparators(items: readonly EditorToolbarItem[]) {
  const kept: EditorToolbarItem[] = []
  for (const item of items) {
    if (item === SEPARATOR && (kept.length === 0 || kept.at(-1) === SEPARATOR))
      continue
    kept.push(item)
  }
  if (kept.at(-1) === SEPARATOR) kept.pop()
  return kept
}

/** The items a preset can show, leaving out controls its UI can't run. */
export function availableItems<Item extends EditorToolbarItem>(
  items: readonly Item[],
  ui: EditorControlUi
) {
  return items.filter((item) => {
    const entry: EditorToolbarItem = item
    return (
      entry === SEPARATOR || 'kind' in entry || (entry.available?.(ui) ?? true)
    )
  })
}

type ToolbarItemsProps = {
  items: readonly EditorToolbarItem[]
  states: readonly (ControlState | undefined)[] | null | undefined
  editor: TiptapEditor | null
  ui: EditorControlUi
  onMenuOpenChange?: (open: boolean) => void
}

export function ToolbarItems({
  items,
  states,
  editor,
  ui,
  onMenuOpenChange
}: ToolbarItemsProps) {
  return items.map((item, index) =>
    item === SEPARATOR ? (
      <Toolbar.Separator key={index} />
    ) : 'kind' in item ? (
      item.kind === 'choice' ? (
        <ChoiceGroup
          key={item.label}
          group={item}
          state={states?.[index]}
          editor={editor}
          ui={ui}
        />
      ) : (
        <BlockMenu
          key={item.label}
          menu={item}
          state={states?.[index]}
          editor={editor}
          onOpenChange={onMenuOpenChange}
        />
      )
    ) : (
      <Control
        key={item.label}
        control={item}
        state={states?.[index]}
        editor={editor}
        ui={ui}
      />
    )
  )
}

// Room under the caret for the bar docked over the keyboard.
const KEYBOARD_SCROLL_MARGIN = { top: 5, right: 5, bottom: 96, left: 5 }
// How far above that bar the caret stays.
const CARET_GAP = 8

/**
 * Scrolls `element` up by `distance` in each box around it that can still
 * scroll, then the page, until it has gone that far.
 */
function scrollBy(element: Element, distance: number) {
  let left = distance
  for (
    let box = element.parentElement;
    box && left > 0;
    box = box.parentElement
  ) {
    const { overflowY } = getComputedStyle(box)
    if (overflowY !== 'auto' && overflowY !== 'scroll') continue
    const from = box.scrollTop
    box.scrollTop += left
    left -= box.scrollTop - from
  }
  if (left > 0) window.scrollBy(0, left)
}

const slotOf = (item: EditorToolbarItem, index: number): ToolbarSlot => {
  if (item === SEPARATOR) return 'separator'
  if (item === undo) return 'undo'
  if (item === redo) return 'redo'
  // A phone's bar keeps Link and Preview in reach, as people use them most.
  if (item === link || item === preview) return 'first'
  return index === 0 && 'kind' in item && item.kind === 'blockMenu'
    ? 'lead'
    : 'item'
}

function outerWidth(element: Element) {
  const { marginInlineStart, marginInlineEnd } = getComputedStyle(element)
  return (
    element.getBoundingClientRect().width +
    parseFloat(marginInlineStart) +
    parseFloat(marginInlineEnd)
  )
}

const sameItems = (
  a: ReadonlySet<number> | null,
  b: ReadonlySet<number> | null
) =>
  a === b ||
  (a !== null &&
    b !== null &&
    a.size === b.size &&
    [...a].every((index) => b.has(index)))

type FittedItemsOptions = {
  items: readonly EditorToolbarItem[]
  barRef: RefObject<HTMLDivElement | null>
  rowRef: RefObject<HTMLDivElement | null>
  moreRef: RefObject<HTMLButtonElement | null>
  /** How many elements come before the items, such as Blocks and its separator. */
  leading: number
  /** Whether the bar shows, as it mounts again each time it's pinned. */
  docked: boolean
  /**
   * While More is open: the page's scroll lock narrows the bar, which would
   * move a control into the open menu.
   */
  held: boolean
}

/**
 * The items that fit the bar on one row, with Undo and More, or null while
 * every one does. Each item's width is kept from when it last showed, as they
 * all do on the first render.
 */
function useFittedItems({
  items,
  barRef,
  rowRef,
  moreRef,
  leading,
  docked,
  held
}: FittedItemsOptions) {
  const [shown, setShown] = useState<ReadonlySet<number> | null>(null)
  const shownRef = useRef(shown)
  const widthsRef = useRef<number[]>([])
  const itemsRef = useRef(items)
  const keyRef = useRef('')
  const key = items
    .map((item) => (item === SEPARATOR ? item : item.label))
    .join()

  useLayoutEffect(() => {
    itemsRef.current = items
  })

  // Children are observed too, so a label's change of width, such as the
  // block type's, fits the row again with no measuring on every render.
  useLayoutEffect(() => {
    shownRef.current = shown
    const bar = barRef.current
    const row = rowRef.current
    if (!bar || !row) return
    if (keyRef.current !== key) {
      keyRef.current = key
      widthsRef.current = []
      if (shown !== null) {
        setShown(null)
        return
      }
    }
    const current = itemsRef.current
    const slots = current.map(slotOf)
    const fit = () => {
      if (held) return
      const order = current
        .map((_, index) => index)
        .filter((index) => shownRef.current?.has(index) ?? true)
      const children = Array.from(row.children)
      const placed = children.slice(leading, leading + order.length)
      if (placed.length < order.length) return
      const { display, columnGap, paddingInlineStart, paddingInlineEnd } =
        getComputedStyle(row)
      // Unstyled, its items stack rather than share a row.
      if (display !== 'flex') return
      const widths = widthsRef.current
      placed.forEach((element, at) => {
        widths[order[at]!] = outerWidth(element)
      })
      const gap = parseFloat(columnGap) || 0
      const own = children.filter(
        (element) => !placed.includes(element) && element !== moreRef.current
      )
      // Without margins, as Unpin's auto margin holds the row's free space.
      const base = own.reduce(
        (sum, element) => sum + element.getBoundingClientRect().width + gap,
        parseFloat(paddingInlineStart) + parseFloat(paddingInlineEnd) - gap
      )
      const next = fitToolbar({
        slots,
        widths,
        base,
        gap,
        // Until it first shows, as wide as Undo, another icon button.
        more: moreRef.current
          ? outerWidth(moreRef.current)
          : (widths[slots.indexOf('undo')] ?? 0),
        available: bar.getBoundingClientRect().width
      })
      if (!sameItems(next, shownRef.current)) {
        shownRef.current = next
        setShown(next)
      }
    }
    fit()
    const observer = new ResizeObserver(fit)
    const observe = () => {
      observer.observe(bar)
      for (const element of row.children) observer.observe(element)
    }
    observe()
    // An app's own controls can come and go.
    const added = new MutationObserver(() => {
      observe()
      fit()
    })
    added.observe(row, { childList: true })
    return () => {
      observer.disconnect()
      added.disconnect()
    }
  }, [barRef, rowRef, moreRef, leading, key, shown, docked, held])
  return shown
}

type MoreMenuProps = {
  buttonRef: RefObject<HTMLButtonElement | null>
  onOpenChange: (open: boolean) => void
  items: readonly EditorToolbarItem[]
  states: readonly (ControlState | undefined)[] | null | undefined
  editor: TiptapEditor | null
  ui: EditorControlUi
}

/** The docked bar's items that don't fit on its row. */
function MoreMenu({
  buttonRef,
  onOpenChange,
  items,
  states,
  editor,
  ui
}: MoreMenuProps) {
  const showsShortcuts = useShowsShortcuts()
  const { triggerRef, popupRef, finalFocus } = useEditorFinalFocus(editor)
  // Closed by unmounting, the menu never says so.
  useEffect(() => () => onOpenChange(false), [onOpenChange])
  const run = (control: EditorControl) => {
    if (!editor) return
    focusEditor(editor)
    control.run(editor, ui)
  }
  const entry = (control: EditorControl, state: ControlState | undefined) => {
    const decorations = {
      icon: <control.icon weight='bold' />,
      shortcut: showsShortcuts ? control.shortcut : undefined,
      disabled: !state?.enabled
    }
    return control.pressed ? (
      <Menu.CheckboxItem
        key={control.label}
        {...decorations}
        checked={state?.pressed ?? false}
        onCheckedChange={() => run(control)}
        closeOnClick
      >
        {control.label}
      </Menu.CheckboxItem>
    ) : (
      <Menu.Item
        key={control.label}
        {...decorations}
        onClick={() => run(control)}
      >
        {control.label}
      </Menu.Item>
    )
  }
  return (
    <Menu onOpenChange={onOpenChange}>
      <Menu.Trigger
        ref={triggerRef}
        render={
          <Toolbar.Button ref={buttonRef} aria-label='More'>
            <DotsThreeIcon weight='bold' className='size-4' aria-hidden />
          </Toolbar.Button>
        }
      />
      <Menu.Content
        ref={popupRef}
        {...{ [EDITOR_POPUP]: '' }}
        finalFocus={finalFocus}
      >
        {items.map((item, index) => {
          if (item === SEPARATOR) {
            const between =
              index > 0 &&
              index < items.length - 1 &&
              items[index - 1] !== SEPARATOR
            return between ? <Menu.Separator key={index} /> : null
          }
          if (!('kind' in item)) return entry(item, states?.[index])
          if (item.kind === 'choice') {
            return item.controls.map((control, at) =>
              entry(control, states?.[index]?.choices?.[at])
            )
          }
          return (
            <BlockMenuRadioGroup
              key={item.label}
              menu={item}
              state={states?.[index]}
              editor={editor}
            />
          )
        })}
      </Menu.Content>
    </Menu>
  )
}

export function EditorToolbarEngine({
  emphasis = 'subtler',
  className,
  children,
  onKeyDown,
  onMouseDown,
  ...props
}: EditorToolbarProps) {
  const context = use(EditorContext)!
  const {
    editor,
    preset,
    size,
    emphasis: editorEmphasis,
    contentId,
    toolbar,
    pinnable,
    setToolbar,
    setToolbarExtras,
    toolbarRef,
    openBlocks
  } = context
  const floating = toolbar === 'floating'
  const stickyRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const top = useStickyTop(stickyRef, !floating)
  const { aboveKeyboard, shift } = useKeyboardDock(stickyRef, barRef, !floating)
  // Held while the bar sits above the keyboard, so the text doesn't move.
  const [reserved, setReserved] = useState<number>()
  const phone = useOnPhone()
  const blockSelected = useEditorState({
    editor,
    selector: ({ editor: current }) =>
      current?.state.selection instanceof NodeSelection
  })
  // Where the selected block starts, while it's one with Settings.
  const settingsAt = useEditorState({
    editor,
    selector: ({ editor: current }) => {
      const selection = current?.state.selection
      return selection instanceof NodeSelection &&
        context.hasSettings(selection.node.type.name)
        ? selection.from
        : null
    }
  })
  const ui: EditorControlUi = {
    ...controlUi(context),
    editSettings:
      settingsAt === null ? undefined : () => context.editSettingsAt(settingsAt)
  }
  // Its settings take the place of the text controls, a tap away.
  const settingsShown =
    phone && blockSelected && (blockSettings.available?.(ui) ?? false)
  // A selected block has no text to format, as the floating bar knows.
  const formatting = new Set<EditorToolbarItem>(floatingControls[preset])
  const items = withoutStraySeparators(
    availableItems(presetControls[preset], ui).filter(
      (item) =>
        !(phone && blockSelected && item !== SEPARATOR && formatting.has(item))
    )
  )
  const states = useEditorState({
    editor,
    selector: ({ editor: current }) =>
      current && !floating ? items.map((item) => stateOf(item, current)) : []
  })

  const editable = useEditorState({
    editor,
    selector: ({ editor: current }) => current?.isEditable ?? false
  })
  const rowRef = useRef<HTMLDivElement>(null)
  const moreRef = useRef<HTMLButtonElement>(null)
  const [moreOpen, setMoreOpen] = useState(false)
  const shown = useFittedItems({
    items,
    barRef,
    rowRef,
    moreRef,
    leading: (openBlocks ? 2 : 0) + (settingsShown ? 1 : 0),
    docked: !floating,
    held: moreOpen && !floating
  })
  const visible = shown ? items.filter((_, index) => shown.has(index)) : items
  const hidden = shown ? items.filter((_, index) => !shown.has(index)) : []
  const stateOfVisible = shown
    ? states?.filter((_, index) => shown.has(index))
    : states
  const stateOfHidden = shown
    ? states?.filter((_, index) => !shown.has(index))
    : []

  useLayoutEffect(() => {
    if (!aboveKeyboard) setReserved(stickyRef.current?.offsetHeight)
  }, [aboveKeyboard])

  // The caret scrolls clear of the bar over the keyboard, not just the screen.
  useEffect(() => {
    if (!editor || editor.isDestroyed || !aboveKeyboard) return
    const { view } = editor
    // Only the margin, as the engine sets the other props on every render.
    const before = view.props.scrollMargin
    view.setProps({ scrollMargin: KEYBOARD_SCROLL_MARGIN })
    // ProseMirror's margin counts only from the scroll box's edge, which a
    // phone's browser can put under the keyboard, so the caret is lifted
    // clear of the bar too, when ProseMirror itself would scroll to it.
    let frame = 0
    const liftNow = () => {
      const bar = barRef.current
      const { selection } = editor.state
      if (!bar || editor.isDestroyed || selection instanceof NodeSelection)
        return
      const caret = view.coordsAtPos(selection.head)
      const clear = bar.getBoundingClientRect().top - CARET_GAP
      if (caret.bottom > clear) scrollBy(view.dom, caret.bottom - clear)
    }
    const lift = ({ transaction }: { transaction: Transaction }) => {
      if (!transaction.scrolledIntoView) return
      liftNow()
      // Again once the browser has laid out what's typed, and the bar has
      // followed the keyboard.
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(liftNow)
    }
    editor.on('transaction', lift)
    return () => {
      cancelAnimationFrame(frame)
      editor.off('transaction', lift)
      if (!editor.isDestroyed) view.setProps({ scrollMargin: before ?? 5 })
    }
  }, [editor, aboveKeyboard])

  useEffect(() => {
    if (!floating) return
    setToolbarExtras(children)
    return () => setToolbarExtras(null)
  }, [floating, children, setToolbarExtras])

  if (floating) return null
  return (
    <div
      ref={stickyRef}
      data-slot='editor-toolbar'
      style={{ top, blockSize: aboveKeyboard ? reserved : undefined }}
      className={cn(
        'shrink-0',
        EDITOR_DOCKED_BAR[editorEmphasis],
        // Above the keyboard, an empty slot in the flow that holds the text
        // still, rather than a band stuck to the top.
        aboveKeyboard
          ? 'border-transparent bg-transparent bg-none'
          : // Above the text that scrolls under it, below the editor's popups.
            'sticky top-0 z-sticky'
      )}
    >
      <div
        ref={barRef}
        data-above-keyboard={aboveKeyboard || undefined}
        style={
          aboveKeyboard ? { bottom: 0, translate: `0 ${shift}px` } : undefined
        }
        className={cn(
          aboveKeyboard &&
            'fixed inset-x-0 z-overlay border-t border-subtler bg-normal pb-[env(safe-area-inset-bottom)]'
        )}
      >
        <Toolbar
          ref={(element) => {
            toolbarRef.current = element
            rowRef.current = element
          }}
          flush
          aria-label='Formatting'
          aria-controls={contentId}
          size={EDITOR_TOOLBAR_SIZE[size]}
          emphasis={emphasis}
          className={cn('w-full', className)}
          // A press between controls keeps focus in the editor.
          onMouseDown={(event) => {
            onMouseDown?.(event)
            const target = event.target as Element
            if (!target.closest('button, a, input')) event.preventDefault()
          }}
          onKeyDown={(event) => {
            onKeyDown?.(event)
            const inToolbar = event.currentTarget.contains(event.target as Node)
            if (event.key !== 'Escape' || !inToolbar || !editor) return
            // Keeps a dialog around the editor open.
            event.stopPropagation()
            focusEditor(editor)
          }}
          {...props}
        >
          {/* First, so a narrow bar leads with it. */}
          <BlocksButton
            openBlocks={openBlocks}
            disabled={!editable}
            separator='after'
          />
          {settingsShown ? (
            <Control
              control={blockSettings}
              state={{ pressed: false, enabled: true }}
              editor={editor}
              ui={ui}
            />
          ) : null}
          <ToolbarItems
            items={visible}
            states={stateOfVisible}
            editor={editor}
            ui={ui}
          />
          {children}
          {hidden.length > 0 ? (
            <MoreMenu
              buttonRef={moreRef}
              onOpenChange={setMoreOpen}
              items={hidden}
              states={stateOfHidden}
              editor={editor}
              ui={ui}
            />
          ) : null}
          {pinnable ? (
            <Tooltip>
              <Tooltip.Trigger
                render={
                  <Toolbar.Button
                    aria-label='Unpin toolbar'
                    className='ms-auto'
                    onClick={() => setToolbar('floating')}
                  >
                    <PushPinSlashIcon
                      weight='bold'
                      className='size-4'
                      aria-hidden
                    />
                  </Toolbar.Button>
                }
              />
              <Tooltip.Content>Unpin toolbar</Tooltip.Content>
            </Tooltip>
          ) : null}
        </Toolbar>
      </div>
    </div>
  )
}
