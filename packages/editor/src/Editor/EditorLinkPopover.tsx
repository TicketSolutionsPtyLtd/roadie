'use client'

import { type RefObject, use, useEffect, useRef, useState } from 'react'

import { LinkBreakIcon, PencilSimpleIcon } from '@phosphor-icons/react'
import { type ChainedCommands, getMarkRange, posToDOMRect } from '@tiptap/core'
import { type Editor as TiptapEditor, useEditorState } from '@tiptap/react'
import { BubbleMenu, type BubbleMenuProps } from '@tiptap/react/menus'

import { Badge } from '@oztix/roadie-components/badge'
import { Button } from '@oztix/roadie-components/button'
import { Popover } from '@oztix/roadie-components/popover'
import { Toolbar } from '@oztix/roadie-components/toolbar'
import { Tooltip } from '@oztix/roadie-components/tooltip'

import { isText } from '../schema/isText'
import { type EditorVariable, linkVariables } from '../schema/variables'
import { EditorContext } from './EditorContext'
import { useRepositionOnResize } from './EditorNodeToolbar'
import { EDITOR_POPOVER_CLASS, EditorPopoverForm } from './EditorPopoverForm'
import { focusEditor } from './focusEditor'
import { type LiveEdit, useLiveEdit } from './useLiveEdit'
import { EDITOR_TOOLBAR_SIZE } from './variants'

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
  revert: LiveEdit['revert']
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
function LinkForm({ editor, inputRef, apply, revert, onDone }: LinkFormProps) {
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
          else revert()
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

/**
 * A web link as its host and path, the parts that say where it goes; any
 * other link, such as `mailto:`, as its address.
 */
export function linkTarget(href: string) {
  if (!URL.canParse(href)) return href
  const url = new URL(href)
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return href.slice(url.protocol.length)
  }
  const path = url.pathname === '/' ? '' : url.pathname.replace(/\/$/, '')
  return `${url.host.replace(/^www\./, '')}${path}`
}

const CARD_KEY = 'editorLinkCard'

const caretInLink: NonNullable<BubbleMenuProps['shouldShow']> = ({
  editor,
  view,
  state,
  element
}) =>
  editor.isEditable &&
  state.selection.empty &&
  editor.isActive('link') &&
  (view.hasFocus() || element.contains(document.activeElement))

/** The whole link around the caret, which the card hangs under. */
function linkAtCaret(editor: TiptapEditor) {
  const { $from } = editor.state.selection
  const type = editor.schema.marks.link
  const range = type && getMarkRange($from, type)
  if (!range) return null
  const box = posToDOMRect(editor.view, range.from, range.to)
  return { getBoundingClientRect: () => box, getClientRects: () => [box] }
}

type LinkCardProps = {
  editor: TiptapEditor
  /** Whether the link editor is open, which the card makes way for. */
  editing: boolean
  onEdit: () => void
}

/**
 * At a caret in a link: where it goes, opening in a new tab, then Edit and
 * Remove. A link variable shows its name, as the sending system fills in
 * its address.
 */
function LinkCard({ editor, editing, onEdit }: LinkCardProps) {
  const context = use(EditorContext)
  const variables = linkVariables(context?.variables)
  const size = EDITOR_TOOLBAR_SIZE[context?.size ?? 'md']
  const link = useEditorState({
    editor,
    selector: ({ editor: current }) =>
      current.state.selection.empty ? currentLink(current) : undefined
  })
  const menuRef = useRef<HTMLDivElement>(null)
  const editingRef = useRef(editing)
  useEffect(() => {
    editingRef.current = editing
  }, [editing])
  useRepositionOnResize(editor, menuRef, CARD_KEY)
  const variable =
    link?.variable === undefined
      ? undefined
      : (variables.find(({ key }) => key === link.variable)?.label ??
        link.variable)

  const remove = () => {
    editor.chain().focus().extendMarkRange('link').unsetLink().run()
  }

  return (
    <BubbleMenu
      editor={editor}
      pluginKey={CARD_KEY}
      updateDelay={0}
      shouldShow={(props) => !editingRef.current && caretInLink(props)}
      getReferencedVirtualElement={() => linkAtCaret(editor)}
      ref={menuRef}
      options={{
        placement: 'bottom-start',
        offset: 4,
        // The plugin makes its element a tab stop; the toolbar inside is the one.
        onShow: () => menuRef.current?.setAttribute('tabindex', '-1')
      }}
      data-slot='editor-link-card'
      className='z-sticky'
    >
      {link && !editing ? (
        <Toolbar
          aria-label='Link actions'
          size={size}
          emphasis='floating'
          // Captured, as an open tooltip keeps Escape from bubbling.
          onKeyDownCapture={(event) => {
            if (event.key === 'Escape') editor.commands.focus()
          }}
        >
          {variable === undefined ? (
            <a
              href={link.href}
              target='_blank'
              rel='noopener noreferrer'
              title={link.href}
              className='is-interactive max-w-56 truncate rounded-sm px-2 text-sm text-subtle'
            >
              {linkTarget(link.href ?? '')}
            </a>
          ) : (
            <Badge emphasis='subtle' className='mx-1'>
              {variable}
            </Badge>
          )}
          <Toolbar.Separator />
          <Tooltip>
            <Tooltip.Trigger
              render={
                <Toolbar.Button aria-label='Edit link' onClick={onEdit}>
                  <PencilSimpleIcon
                    weight='bold'
                    className='size-4'
                    aria-hidden
                  />
                </Toolbar.Button>
              }
            />
            <Tooltip.Content>Edit link</Tooltip.Content>
          </Tooltip>
          <Tooltip>
            <Tooltip.Trigger
              render={
                <Toolbar.Button aria-label='Remove link' onClick={remove}>
                  <LinkBreakIcon weight='bold' className='size-4' aria-hidden />
                </Toolbar.Button>
              }
            />
            <Tooltip.Content>Remove link</Tooltip.Content>
          </Tooltip>
        </Toolbar>
      ) : null}
    </BubbleMenu>
  )
}

type EditorLinkPopoverProps = {
  editor: TiptapEditor | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Adds, changes or removes the link on the selection, anchored to it. Escape
 * or Close puts the link back as it was. At a caret in a link, a card shows
 * where it goes, with Edit and Remove.
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
    <>
      <LinkCard
        editor={editor}
        editing={open}
        onEdit={() => onOpenChange(true)}
      />
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
            revert={live.revert}
            onDone={live.done}
          />
        </Popover.Content>
      </Popover>
    </>
  )
}
