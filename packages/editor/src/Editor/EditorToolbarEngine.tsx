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
  presetControls,
  redo,
  undo
} from './controls'
import { focusEditor } from './focusEditor'
import { useShowsShortcuts } from './menuGroups'
import { type ToolbarSlot, fitToolbar } from './toolbarFit'
import { useStickyTop } from './toolbarMode'
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
}

export function BlockMenu({
  menu,
  state,
  editor,
  onOpenChange
}: BlockMenuProps) {
  const current = state?.current ?? menu.types[0]?.label
  const showsShortcuts = useShowsShortcuts()
  return (
    <Menu onOpenChange={onOpenChange}>
      <Menu.Trigger
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
        finalFocus={() => {
          // At once, as Firefox drops a caret move made before a deferred focus lands.
          if (editor) focusEditor(editor)
          return false
        }}
      >
        <Menu.RadioGroup
          value={current}
          onValueChange={(label) => {
            const type = menu.types.find((option) => option.label === label)
            if (editor && type) type.run(editor)
          }}
        >
          {menu.types.map((type) => (
            <Menu.RadioItem
              key={type.label}
              value={type.label}
              shortcut={showsShortcuts ? type.shortcut : undefined}
              closeOnClick
            >
              {type.label}
            </Menu.RadioItem>
          ))}
        </Menu.RadioGroup>
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
    importSource
  } = context
  return {
    editLink,
    editAlt,
    editEmbed,
    pickImage,
    replaceImage,
    editButton,
    editVariable,
    importSource
  }
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

const slotOf = (item: EditorToolbarItem, index: number): ToolbarSlot => {
  if (item === SEPARATOR) return 'separator'
  if (item === undo) return 'undo'
  if (item === redo) return 'redo'
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
  leading
}: FittedItemsOptions) {
  const [shown, setShown] = useState<ReadonlySet<number> | null>(null)
  const shownRef = useRef(shown)
  const widthsRef = useRef<number[]>([])

  useLayoutEffect(() => {
    shownRef.current = shown
    const bar = barRef.current
    const row = rowRef.current
    if (!bar || !row) return
    const slots = items.map(slotOf)
    const fit = () => {
      const order = items
        .map((_, index) => index)
        .filter((index) => shownRef.current?.has(index) ?? true)
      const children = Array.from(row.children)
      const placed = children.slice(leading, leading + order.length)
      if (placed.length < order.length) return
      const widths = widthsRef.current
      placed.forEach((element, at) => {
        widths[order[at]!] = outerWidth(element)
      })
      const { display, columnGap, paddingInlineStart, paddingInlineEnd } =
        getComputedStyle(row)
      // Unstyled, its items stack rather than share a row.
      if (display !== 'flex') return
      const gap = parseFloat(columnGap) || 0
      const own = children.filter(
        (element) => !placed.includes(element) && element !== moreRef.current
      )
      const base = own.reduce(
        (sum, element) => sum + outerWidth(element) + gap,
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
        available: bar.clientWidth
      })
      if (!sameItems(next, shownRef.current)) {
        shownRef.current = next
        setShown(next)
      }
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(bar)
    observer.observe(row)
    return () => observer.disconnect()
  })
  return shown
}

type MoreMenuProps = {
  buttonRef: RefObject<HTMLButtonElement | null>
  items: readonly EditorToolbarItem[]
  states: readonly (ControlState | undefined)[] | null | undefined
  editor: TiptapEditor | null
  ui: EditorControlUi
}

/** The docked bar's items that don't fit on its row. */
function MoreMenu({ buttonRef, items, states, editor, ui }: MoreMenuProps) {
  const showsShortcuts = useShowsShortcuts()
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
    <Menu>
      <Menu.Trigger
        render={
          <Toolbar.Button ref={buttonRef} aria-label='More'>
            <DotsThreeIcon weight='bold' className='size-4' aria-hidden />
          </Toolbar.Button>
        }
      />
      <Menu.Content
        finalFocus={() => {
          // At once, as Firefox drops a caret move made before a deferred focus lands.
          if (editor) focusEditor(editor)
          return false
        }}
      >
        {items.map((item, index) => {
          if (item === SEPARATOR) return <Menu.Separator key={index} />
          if (!('kind' in item)) return entry(item, states?.[index])
          if (item.kind === 'choice') {
            return item.controls.map((control, at) =>
              entry(control, states?.[index]?.choices?.[at])
            )
          }
          return (
            <Menu.RadioGroup
              key={item.label}
              value={states?.[index]?.current}
              onValueChange={(label) => {
                const type = item.types.find((option) => option.label === label)
                if (editor && type) type.run(editor)
              }}
            >
              {item.types.map((type) => (
                <Menu.RadioItem
                  key={type.label}
                  value={type.label}
                  closeOnClick
                >
                  {type.label}
                </Menu.RadioItem>
              ))}
            </Menu.RadioGroup>
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
  const barRef = useRef<HTMLDivElement>(null)
  const top = useStickyTop(barRef, !floating)
  const ui = controlUi(context)
  const items = availableItems(presetControls[preset], ui)
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
  const shown = useFittedItems({
    items,
    barRef,
    rowRef,
    moreRef,
    leading: openBlocks ? 2 : 0
  })
  const visible = shown ? items.filter((_, index) => shown.has(index)) : items
  const hidden = shown ? items.filter((_, index) => !shown.has(index)) : []
  const stateOfVisible = shown
    ? states?.filter((_, index) => shown.has(index))
    : states
  const stateOfHidden = shown
    ? states?.filter((_, index) => !shown.has(index))
    : []

  useEffect(() => {
    if (!floating) return
    setToolbarExtras(children)
    return () => setToolbarExtras(null)
  }, [floating, children, setToolbarExtras])

  if (floating) return null
  return (
    <div
      ref={barRef}
      data-slot='editor-toolbar'
      style={{ top }}
      // Above the text that scrolls under it, below the editor's popups.
      className={cn(
        'sticky top-0 z-sticky shrink-0',
        EDITOR_DOCKED_BAR[editorEmphasis]
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
        {/* First, as a phone's bar scrolls and would hide it at the end. */}
        <BlocksButton
          openBlocks={openBlocks}
          disabled={!editable}
          separator='after'
        />
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
  )
}
