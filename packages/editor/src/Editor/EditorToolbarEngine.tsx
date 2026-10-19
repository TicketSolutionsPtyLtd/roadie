'use client'

import { use } from 'react'

import { type Editor as TiptapEditor, useEditorState } from '@tiptap/react'

import { Toolbar } from '@oztix/roadie-components/toolbar'
import { Tooltip } from '@oztix/roadie-components/tooltip'
import { cn } from '@oztix/roadie-core/utils'

import { EditorContext } from './EditorContext'
import type { EditorToolbarProps } from './EditorToolbar'
import {
  type EditorControl,
  type EditorControlUi,
  type EditorToolbarItem,
  SEPARATOR,
  ariaKeyShortcuts,
  editorControls
} from './controls'
import { focusEditor } from './focusEditor'
import { EDITOR_TOOLBAR_ROOM, EDITOR_TOOLBAR_SIZE } from './variants'

type ControlState = { pressed: boolean; enabled: boolean }

function stateOf(item: EditorToolbarItem, editor: TiptapEditor) {
  if (item === SEPARATOR) return undefined
  return {
    pressed: item.pressed?.(editor) ?? false,
    enabled: editor.isEditable && (item.enabled?.(editor) ?? true)
  }
}

type ControlProps = {
  control: EditorControl
  state: ControlState | undefined
  editor: TiptapEditor | null
  ui: EditorControlUi
}

function Control({ control, state, editor, ui }: ControlProps) {
  const { label, icon: Icon, shortcut } = control
  const run = () => {
    if (editor) control.run(editor, ui)
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
    size,
    emphasis: editorEmphasis,
    contentId,
    toolbarRef,
    editLink
  } = use(EditorContext)!
  const toolbarSize = EDITOR_TOOLBAR_SIZE[size]
  const ui = { editLink }
  const states = useEditorState({
    editor,
    selector: ({ editor: current }) =>
      current ? editorControls.map((item) => stateOf(item, current)) : []
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
        {editorControls.map((item, index) =>
          item === SEPARATOR ? (
            <Toolbar.Separator key={index} />
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
