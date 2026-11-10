'use client'

import { type RefObject, useEffect, useRef, useState } from 'react'

import { posToDOMRect } from '@tiptap/core'
import type { Editor as TiptapEditor } from '@tiptap/react'

import { Popover } from '@oztix/roadie-components/popover'

import {
  type ButtonAlign,
  type ButtonLook,
  buttonLook,
  isEmailHref
} from '../schema/emailAttrs'
import { isText } from '../schema/isText'
import { type Choice, EditorChoice } from './EditorChoice'
import { toHref } from './EditorLinkPopover'
import {
  EditorLinkTargetFields,
  type LinkTarget
} from './EditorLinkTargetFields'
import { selectedNode, selectedNodeType } from './EditorNodeToolbar'
import { EDITOR_POPOVER_CLASS, EditorPopoverForm } from './EditorPopoverForm'
import { EditorSettingsPopup } from './EditorSettingsPopup'
import { buttonBlock, insertBlock } from './emailEditing'
import { focusEditor } from './focusEditor'
import { EDITOR_POPUP, useOnPhone } from './toolbarMode'
import { type LiveEdit, useLiveEdit } from './useLiveEdit'

type ButtonFormProps = {
  editor: TiptapEditor
  inputRef: RefObject<HTMLInputElement | null>
  onDone: () => void
}

type SettingsRefs = {
  emphasisRef: RefObject<HTMLButtonElement | null>
}

function buttonHref(editor: TiptapEditor) {
  if (selectedNodeType(editor.state) !== 'button') return undefined
  const href: unknown = editor.getAttributes('button').href
  return typeof href === 'string' ? href : ''
}

const REFUSED =
  'Enter a full web address, such as oztix.com.au, or a mailto: or tel: link.'

function AddButtonForm({ editor, inputRef, onDone }: ButtonFormProps) {
  const [typed, setTyped] = useState('')
  const [refused, setRefused] = useState(false)

  const save = () => {
    const href = toHref(typed)
    if (!isEmailHref(href)) {
      setRefused(true)
      return false
    }
    editor
      .chain()
      .focus()
      .command(insertBlock(buttonBlock(href)))
      .run()
    onDone()
    return true
  }

  return (
    <EditorPopoverForm
      label='Button link'
      inputRef={inputRef}
      type='url'
      inputMode='url'
      placeholder='Paste a link'
      value={typed}
      onValueChange={(value) => {
        setTyped(value)
        setRefused(false)
      }}
      submitLabel='Add button'
      onSubmit={save}
      invalid={refused}
      error={REFUSED}
    />
  )
}

const EMPHASES = [
  { value: 'strong', label: 'Strong' },
  { value: 'normal', label: 'Normal' },
  { value: 'subtle', label: 'Subtle' }
] as const

const WIDTHS = [
  { value: 'fit', label: 'Fit' },
  { value: 'full', label: 'Full width' }
] as const

const ALIGNS: readonly Choice<ButtonAlign>[] = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Centre' },
  { value: 'right', label: 'Right' }
]

type SettingsFormProps = ButtonFormProps &
  SettingsRefs & {
    apply: LiveEdit['apply']
    href: string
    variable?: string
    look: ButtonLook
  }

// Undefined clears an attr, so the button saves only what isn't the default.
const lookAttrs = ({ emphasis, fullWidth, align }: ButtonLook) => ({
  emphasis,
  fullWidth,
  align: fullWidth ? undefined : align
})

/** Applies each change as it's made: a choice at once, a link once it's whole. */
function ButtonSettingsForm({
  editor,
  inputRef,
  emphasisRef,
  href,
  variable,
  look: saved,
  apply: applyLive,
  onDone
}: SettingsFormProps) {
  const [look, setLook] = useState(saved)

  // The popover keeps focus, so the editor's selection stays on the button.
  const apply = (attrs: Record<string, unknown>) =>
    applyLive((chain) => chain.updateAttributes('button', attrs))

  const changeLook = (change: ButtonLook) => {
    const next = { ...look, ...change }
    setLook(next)
    apply(lookAttrs(next))
  }

  return (
    <form
      noValidate
      className='grid gap-4'
      onSubmit={(event) => {
        event.preventDefault()
        // React bubbles a portalled submit to the form around the editor.
        event.stopPropagation()
        onDone()
      }}
    >
      <EditorLinkTargetFields
        editor={editor}
        target={{ href, variable }}
        inputRef={inputRef}
        onTargetChange={(target: LinkTarget) =>
          apply({ href: target.href, variable: target.variable })
        }
      />
      <EditorChoice
        legend='Emphasis'
        choices={EMPHASES}
        value={look.emphasis ?? 'strong'}
        onValueChange={(emphasis) =>
          changeLook({ emphasis: emphasis === 'strong' ? undefined : emphasis })
        }
        chosenRef={emphasisRef}
      />
      <EditorChoice
        legend='Width'
        choices={WIDTHS}
        value={look.fullWidth ? 'full' : 'fit'}
        onValueChange={(width) =>
          changeLook({ fullWidth: width === 'full' || undefined })
        }
      />
      <EditorChoice
        legend='Align'
        choices={ALIGNS}
        value={look.align ?? 'left'}
        onValueChange={(align) =>
          changeLook({ align: align === 'left' ? undefined : align })
        }
        disabled={look.fullWidth}
        helperText={
          look.fullWidth ? 'A full-width button spans its column.' : null
        }
      />
    </form>
  )
}

function ButtonForm({
  editor,
  inputRef,
  emphasisRef,
  apply,
  onDone
}: ButtonFormProps & SettingsRefs & { apply: LiveEdit['apply'] }) {
  // Read as the form opens: the editor is mutable, so the React Compiler
  // would cache a read during render by the editor alone.
  const [current] = useState(() => {
    const href = buttonHref(editor)
    if (href === undefined) return undefined
    const attrs = editor.getAttributes('button')
    const variable: unknown = attrs.variable
    return {
      href,
      variable: typeof variable === 'string' ? variable : undefined,
      look: buttonLook(attrs)
    }
  })
  if (!current) {
    return <AddButtonForm editor={editor} inputRef={inputRef} onDone={onDone} />
  }
  return (
    <ButtonSettingsForm
      editor={editor}
      inputRef={inputRef}
      emphasisRef={emphasisRef}
      href={current.href}
      variable={current.variable}
      look={current.look}
      apply={apply}
      onDone={onDone}
    />
  )
}

type EditorButtonPopoverProps = {
  editor: TiptapEditor | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Leaves the button selected as it closes, as when opened from the keyboard. */
  keepSelected?: boolean
}

/** The selected button's own box, so the settings open clear of it. */
function buttonBox(editor: TiptapEditor) {
  const found = selectedNode(editor.state)
  const element = found && editor.view.nodeDOM(found.pos)
  return element instanceof HTMLElement
    ? element.getBoundingClientRect()
    : undefined
}

function hasLink(editor: TiptapEditor) {
  const { href, variable } = editor.getAttributes('button')
  return isText(href) || isText(variable)
}

/**
 * Adds a button from its link, or edits the selected button's link, style,
 * width and alignment, opening on its emphasis once it has a link. On a
 * phone the settings open as a sheet from the bottom. Escape keeps the
 * changes, as a click away does, for Undo to take back in one step.
 */
export function EditorButtonPopover({
  editor,
  open,
  onOpenChange,
  keepSelected = false
}: EditorButtonPopoverProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const emphasisRef = useRef<HTMLButtonElement>(null)
  const phone = useOnPhone()
  const live = useLiveEdit(editor, open, onOpenChange, {
    keepSelected: keepSelected && !phone
  })
  const sheet = open && phone
  useEffect(() => {
    if (!sheet || !editor) return
    const frame = requestAnimationFrame(() => {
      const found = selectedNode(editor.state)
      if (found?.type !== 'button') return
      const element = editor.view.nodeDOM(found.pos)
      if (!(element instanceof HTMLElement)) return
      // Above the sheet, which takes the bottom half of the screen.
      element.style.scrollMarginBottom = 'calc(50dvh + 1rem)'
      element.scrollIntoView({ block: 'nearest' })
      element.style.scrollMarginBottom = ''
    })
    return () => cancelAnimationFrame(frame)
  }, [sheet, editor])
  if (!editor) return null
  const editing = selectedNodeType(editor.state) === 'button'
  const { from, to } = editor.state.selection
  // The element lets the popover follow a scrolling container around the editor.
  const anchor = {
    getBoundingClientRect: () =>
      (editing && buttonBox(editor)) || posToDOMRect(editor.view, from, to),
    contextElement: editor.view.dom
  }
  // Read as it opens: the React Compiler would cache a read during render by
  // the editor alone, which is mutable.
  const initialFocus = () =>
    selectedNodeType(editor.state) === 'button' && hasLink(editor)
      ? emphasisRef.current
      : inputRef.current
  const finalFocus = () => {
    focusEditor(editor)
    return false
  }
  const form = (
    <ButtonForm
      key={editing ? `edit-${from}` : 'add'}
      editor={editor}
      inputRef={inputRef}
      emphasisRef={emphasisRef}
      apply={live.apply}
      onDone={live.done}
    />
  )
  if (editing) {
    return (
      <EditorSettingsPopup
        title='Button settings'
        open={open}
        live={live}
        anchor={anchor}
        initialFocus={initialFocus}
        finalFocus={finalFocus}
      >
        {form}
      </EditorSettingsPopup>
    )
  }
  return (
    <Popover open={open} onOpenChange={live.onOpenChange}>
      <Popover.Content
        {...{ [EDITOR_POPUP]: '' }}
        side='bottom'
        align='start'
        sideOffset={8}
        className={EDITOR_POPOVER_CLASS}
        positionerProps={{ anchor }}
        initialFocus={initialFocus}
        finalFocus={finalFocus}
      >
        {form}
      </Popover.Content>
    </Popover>
  )
}
