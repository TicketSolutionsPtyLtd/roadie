'use client'

import { use } from 'react'

import { CaretDownIcon } from '@phosphor-icons/react'
import { type Editor as TiptapEditor, useEditorState } from '@tiptap/react'

import { Menu } from '@oztix/roadie-components/menu'
import { Toolbar } from '@oztix/roadie-components/toolbar'
import { Tooltip } from '@oztix/roadie-components/tooltip'
import { cn } from '@oztix/roadie-core/utils'

import { EditorContext } from './EditorContext'
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
import { EDITOR_TOOLBAR_ROOM, EDITOR_TOOLBAR_SIZE } from './variants'

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
}

export function BlockMenu({ menu, state, editor }: BlockMenuProps) {
  const current = state?.current ?? menu.types[0]?.label
  return (
    <Menu>
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
          editor?.commands.focus()
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

export function EditorToolbarEngine({
  emphasis = 'normal',
  className,
  children,
  onKeyDown,
  onMouseDown,
  ...props
}: EditorToolbarProps) {
  const {
    editor,
    preset,
    size,
    emphasis: editorEmphasis,
    contentId,
    toolbarRef,
    editLink,
    editAlt,
    editEmbed,
    pickImage,
    replaceImage,
    editButton
  } = use(EditorContext)!
  const toolbarSize = EDITOR_TOOLBAR_SIZE[size]
  const ui = {
    editLink,
    editAlt,
    editEmbed,
    pickImage,
    replaceImage,
    editButton
  }
  const items = presetControls[preset].filter(
    (item) =>
      item === SEPARATOR || 'kind' in item || (item.available?.(ui) ?? true)
  )
  const states = useEditorState({
    editor,
    selector: ({ editor: current }) =>
      current ? items.map((item) => stateOf(item, current)) : []
  })

  return (
    // The room goes outside the toolbar, whose surface is at most as wide as this.
    <div className={cn('shrink-0', EDITOR_TOOLBAR_ROOM[editorEmphasis])}>
      <Toolbar
        ref={toolbarRef}
        aria-label='Formatting'
        aria-controls={contentId}
        size={toolbarSize}
        emphasis={emphasis}
        className={className}
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
        {items.map((item, index) =>
          item === SEPARATOR ? (
            <Toolbar.Separator key={index} />
          ) : 'kind' in item ? (
            <BlockMenu
              key={item.label}
              menu={item}
              state={states?.[index]}
              editor={editor}
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
        )}
        {children}
      </Toolbar>
    </div>
  )
}
