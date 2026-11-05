'use client'

import { type RefObject, use, useRef, useState } from 'react'

import { type ChainedCommands, posToDOMRect } from '@tiptap/core'
import type { Editor as TiptapEditor } from '@tiptap/react'

import { Button } from '@oztix/roadie-components/button'
import { Popover } from '@oztix/roadie-components/popover'

import { isText } from '../schema/isText'
import { type EditorVariable, linkVariables } from '../schema/variables'
import { EditorContext } from './EditorContext'
import { EDITOR_POPOVER_CLASS, EditorPopoverForm } from './EditorPopoverForm'
import { focusEditor } from './focusEditor'
import { type LiveEdit, useLiveEdit } from './useLiveEdit'

const HAS_SCHEME = /^[a-z][a-z\d+.-]*:/i
const BARE_DOMAIN = /^[^\s/?#:@]+\.[a-z]{2,}(?:[/?#:]|$)/i

/** Adds `https://` to a bare domain, such as `oztix.com.au/events`. */
export function toHref(typed: string) {
  const trimmed = typed.trim()
  return !HAS_SCHEME.test(trimmed) && BARE_DOMAIN.test(trimmed)
    ? `https://${trimmed}`
    : trimmed
}

function isLinkable(editor: TiptapEditor, href: string) {
  return (
    /^\S+$/.test(href) && URL.canParse(href) && editor.can().setLink({ href })
  )
}

type LinkFormProps = {
  editor: TiptapEditor
  inputRef: RefObject<HTMLInputElement | null>
  apply: LiveEdit['apply']
  onDone: () => void
}

type LinkAttrs = { href?: string; variable?: string }

// setMark keeps attrs it isn't given, so each clears the other's.
const setLink = (attrs: LinkAttrs) => (chain: ChainedCommands) =>
  chain
    .extendMarkRange('link')
    .setMark('link', { href: undefined, variable: undefined, ...attrs })

const unlink = (chain: ChainedCommands) =>
  chain.extendMarkRange('link').unsetLink()

type CurrentLink = { href?: string; variable?: string }

function currentLink(editor: TiptapEditor): CurrentLink | undefined {
  const { href, variable }: Record<string, unknown> =
    editor.getAttributes('link')
  if (isText(variable)) return { variable }
  return typeof href === 'string' ? { href } : undefined
}

/** The link variables a link can link to, where its preset saves one. */
export function useLinkVariables(editor: TiptapEditor) {
  const variables = linkVariables(use(EditorContext)?.variables)
  return editor.schema.marks.link?.spec.attrs?.variable ? variables : []
}

type VariableLinksProps = {
  variables: readonly EditorVariable[]
  current?: string
  onPick: (variable: EditorVariable) => void
}

function VariableLinks({ variables, current, onPick }: VariableLinksProps) {
  return (
    <div className='grid gap-1 px-2 pt-2 pb-1'>
      <p className='text-sm text-subtle'>Or link to</p>
      <div className='flex flex-wrap gap-1'>
        {variables.map((variable) => (
          <Button
            key={variable.key}
            size='sm'
            emphasis={variable.key === current ? 'subtle' : 'subtler'}
            aria-pressed={variable.key === current}
            onClick={() => onPick(variable)}
          >
            {variable.label}
          </Button>
        ))}
      </div>
    </div>
  )
}

/**
 * Links the selection, or changes its link, as a whole address is typed. At
 * a caret with no link, it adds the link's text on save.
 */
function LinkForm({ editor, inputRef, apply, onDone }: LinkFormProps) {
  // Read as the form opens: the editor is mutable, so the React Compiler
  // would cache a read during render by the editor alone.
  const [current] = useState(() => currentLink(editor))
  const editing = current !== undefined
  const [inserting] = useState(() => editor.state.selection.empty && !editing)
  const [typed, setTyped] = useState(current?.href ?? '')
  const [refused, setRefused] = useState(false)
  const variables = useLinkVariables(editor)

  const link = (attrs: LinkAttrs, text: string) => {
    if (inserting) {
      editor
        .chain()
        .focus()
        .insertContent({ type: 'text', text, marks: [{ type: 'link', attrs }] })
        .run()
    } else {
      apply(setLink(attrs))
    }
    onDone()
  }

  const save = () => {
    const href = toHref(typed)
    if (!isLinkable(editor, href)) {
      setRefused(true)
      return false
    }
    link({ href }, href)
    return true
  }

  const remove = () => {
    apply(unlink)
    onDone()
  }

  return (
    <>
      <EditorPopoverForm
        label='Link'
        inputRef={inputRef}
        type='url'
        inputMode='url'
        placeholder='Paste a link'
        value={typed}
        onValueChange={(value) => {
          setTyped(value)
          setRefused(false)
          if (inserting) return
          const href = toHref(value)
          if (isLinkable(editor, href)) apply(setLink({ href }))
          else apply(current ? setLink(current) : unlink)
        }}
        submitLabel='Save link'
        onSubmit={save}
        invalid={refused}
        error='Enter a web address, such as oztix.com.au.'
        remove={editing ? { label: 'Remove link', onClick: remove } : undefined}
      />
      {variables.length > 0 ? (
        <VariableLinks
          variables={variables}
          current={current?.variable}
          onPick={(variable) =>
            link({ variable: variable.key }, variable.label)
          }
        />
      ) : null}
    </>
  )
}

type EditorLinkPopoverProps = {
  editor: TiptapEditor | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Adds, changes or removes the link on the selection, anchored to it. Escape
 * or Close puts the link back as it was.
 */
export function EditorLinkPopover({
  editor,
  open,
  onOpenChange
}: EditorLinkPopoverProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const live = useLiveEdit(editor, open, onOpenChange)
  if (!editor) return null
  const { from, to } = editor.state.selection
  // The element lets the popover follow a scrolling container around the editor.
  const anchor = {
    getBoundingClientRect: () => posToDOMRect(editor.view, from, to),
    contextElement: editor.view.dom
  }
  return (
    <Popover open={open} onOpenChange={live.onOpenChange}>
      <Popover.Content
        side='bottom'
        align='start'
        className={EDITOR_POPOVER_CLASS}
        positionerProps={{ anchor }}
        initialFocus={inputRef}
        finalFocus={() => {
          focusEditor(editor)
          return false
        }}
      >
        <LinkForm
          editor={editor}
          inputRef={inputRef}
          apply={live.apply}
          onDone={live.done}
        />
      </Popover.Content>
    </Popover>
  )
}
