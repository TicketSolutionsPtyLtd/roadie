'use client'

import { use, useEffect, useRef } from 'react'

import { CaretDownIcon, PushPinSlashIcon } from '@phosphor-icons/react'
import { type Editor as TiptapEditor, useEditorState } from '@tiptap/react'

import { Menu } from '@oztix/roadie-components/menu'
import { Toolbar } from '@oztix/roadie-components/toolbar'
import { Tooltip } from '@oztix/roadie-components/tooltip'
import { cn } from '@oztix/roadie-core/utils'

import { EditorContext, type EditorContextValue } from './EditorContext'
import type { EditorToolbarProps } from './EditorToolbar'
import {
  type EditorBlockMenu,
  type EditorControl,
  type EditorControlUi,
  type EditorToolbarItem,
  SEPARATOR,
  ariaKeyShortcuts,
  presetControls
} from './controls'
import { focusEditor } from './focusEditor'
import { useStickyTop } from './toolbarMode'
import { EDITOR_DOCKED_BAR, EDITOR_TOOLBAR_SIZE } from './variants'

export type ControlState = {
  pressed: boolean
  enabled: boolean
  current?: string
}

export function stateOf(item: EditorToolbarItem, editor: TiptapEditor) {
  if (item === SEPARATOR) return undefined
  if ('kind' in item) {
    const current = item.types.find((type) => type.active(editor))
    return {
      pressed: false,
      enabled: editor.isEditable,
      current: current?.label ?? item.fallback?.(editor) ?? item.types[0]?.label
    }
  }
  return {
    pressed: item.pressed?.(editor) ?? false,
    enabled: editor.isEditable && (item.enabled?.(editor) ?? true)
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
              shortcut={type.shortcut}
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
}

export function Control({ control, state, editor, ui }: ControlProps) {
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
          control.pressed ? (
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

/** What the controls open in the editor's own UI, from its context. */
export function controlUi(context: EditorContextValue): EditorControlUi {
  const { editLink, editAlt, editEmbed, pickImage, replaceImage, editButton } =
    context
  return { editLink, editAlt, editEmbed, pickImage, replaceImage, editButton }
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
      <BlockMenu
        key={item.label}
        menu={item}
        state={states?.[index]}
        editor={editor}
        onOpenChange={onMenuOpenChange}
      />
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
    toolbarRef
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
        ref={toolbarRef}
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
          focusEditor(editor)
        }}
        {...props}
      >
        <ToolbarItems items={items} states={states} editor={editor} ui={ui} />
        {children}
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
