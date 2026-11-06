'use client'

import { type RefObject, useEffect, useRef, useState } from 'react'

import { posToDOMRect } from '@tiptap/core'
import { NodeSelection } from '@tiptap/pm/state'
import { type Editor as TiptapEditor, useEditorState } from '@tiptap/react'

import { Field } from '@oztix/roadie-components/field'
import { Popover } from '@oztix/roadie-components/popover'

import {
  type EmbedProvider,
  defaultEmbedProviders,
  embedShareUrl,
  parseEmbedUrl
} from '../schema/embed'
import { type EmbedAttrs, embedAttrs } from '../schema/embedAttrs'
import { EDITOR_POPOVER_CLASS, EditorPopoverForm } from './EditorPopoverForm'
import { EditorSettingsPopup } from './EditorSettingsPopup'
import { focusEditor } from './focusEditor'
import { useOnPhone } from './toolbarMode'
import { type LiveEdit, setSelectedAttrs, useLiveEdit } from './useLiveEdit'

const REFUSED = 'That link can’t be embedded.'
const REFUSED_DEFAULT = `${REFUSED} Use a share link from YouTube, Vimeo, Spotify, SoundCloud, Deezer, Apple Music, or TikTok.`

const refusal = (providers: readonly EmbedProvider[]) =>
  providers === defaultEmbedProviders ? REFUSED_DEFAULT : REFUSED

type EmbedFormProps = {
  editor: TiptapEditor
  providers: readonly EmbedProvider[]
  resolveUrl: ((url: string) => Promise<string>) | undefined
  inputRef: RefObject<HTMLInputElement | null>
  onDone: () => void
}

function selectedEmbed(editor: TiptapEditor): EmbedAttrs | null {
  const { selection } = editor.state
  const isEmbed =
    selection instanceof NodeSelection && selection.node.type.name === 'embed'
  return isEmbed ? embedAttrs(selection.node.attrs) : null
}

/**
 * Embeds a link as it is, or as `resolveUrl` gives it back, such as a short
 * link's target. `save` resolves whether it embedded, or `true` once the
 * form has closed while it resolved, which cancels it.
 */
function useEmbedding(
  resolveUrl: ((url: string) => Promise<string>) | undefined,
  embed: (url: string) => boolean
) {
  const [resolving, setResolving] = useState(false)
  const closed = useRef(false)
  useEffect(() => {
    closed.current = false
    return () => {
      closed.current = true
    }
  }, [])
  const save = async (typed: string) => {
    const url = typed.trim()
    if (embed(url)) return true
    if (!resolveUrl || !URL.canParse(url)) return false
    setResolving(true)
    const resolved = await resolveUrl(url).catch(() => '')
    if (closed.current) return true
    setResolving(false)
    return embed(resolved)
  }
  return { save, resolving }
}

/** Adds an embed at the selection from a link that embeds. */
function AddEmbedForm({
  editor,
  providers,
  resolveUrl,
  inputRef,
  onDone
}: EmbedFormProps) {
  const [typed, setTyped] = useState('')
  const [refused, setRefused] = useState(false)
  const { save, resolving } = useEmbedding(resolveUrl, (url) => {
    const value = parseEmbedUrl(url, providers)
    if (!value) return false
    editor.chain().focus().setEmbed(value).run()
    onDone()
    return true
  })

  return (
    <EditorPopoverForm
      label='Video or audio link'
      inputRef={inputRef}
      type='url'
      inputMode='url'
      placeholder='Paste a video or audio link'
      value={typed}
      onValueChange={(value) => {
        setTyped(value)
        setRefused(false)
      }}
      submitLabel='Embed link'
      onSubmit={async () => {
        const saved = await save(typed)
        setRefused(!saved)
        return saved
      }}
      busy={resolving}
      invalid={refused}
      error={refusal(providers)}
    />
  )
}

type EmbedSettingsFormProps = EmbedFormProps & {
  apply: LiveEdit['apply']
  revert: LiveEdit['revert']
}

/** Changes the selected embed as a link that embeds is typed. */
function EmbedSettingsForm({
  editor,
  providers,
  resolveUrl,
  inputRef,
  apply,
  revert,
  onDone
}: EmbedSettingsFormProps) {
  // Read as the form opens: the editor is mutable, so the React Compiler
  // would cache a read during render by the editor alone.
  const [saved] = useState(() => {
    const { params, ...value } = selectedEmbed(editor)!
    return embedShareUrl(params ? { ...value, params } : value, providers)
  })
  const [typed, setTyped] = useState(saved)
  const [refused, setRefused] = useState(false)

  // In place, so the embed stays selected for the next change.
  const change = (url: string) => {
    const value = parseEmbedUrl(url, providers)
    if (!value) return false
    const { provider, id, params } = value
    apply(setSelectedAttrs({ provider, id, params: params ?? null }))
    return true
  }
  const { save, resolving } = useEmbedding(resolveUrl, (url) => {
    if (!change(url)) return false
    onDone()
    return true
  })

  return (
    <form
      noValidate
      className='grid gap-4'
      onSubmit={async (event) => {
        event.preventDefault()
        // React bubbles a portalled submit to the form around the editor.
        event.stopPropagation()
        if (resolving) return
        if (!(await save(typed))) setRefused(true)
      }}
    >
      <Field invalid={refused}>
        <Field.Label>Video or audio link</Field.Label>
        <Field.Input
          ref={inputRef}
          type='url'
          inputMode='url'
          placeholder='Paste a video or audio link'
          value={typed}
          aria-busy={resolving || undefined}
          onChange={(event) => {
            const { value } = event.target
            setTyped(value)
            setRefused(false)
            if (!change(value.trim())) revert()
          }}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return
            event.preventDefault()
            // The Enter that picks an IME candidate only ends the composition.
            const composing =
              event.nativeEvent.isComposing || event.keyCode === 229
            if (!composing) event.currentTarget.form?.requestSubmit()
          }}
          // Selected, so typing replaces it; backward, so a long link shows
          // its start.
          onFocus={(event) => {
            const input = event.currentTarget
            if (input.value !== saved) return
            input.setSelectionRange(0, input.value.length, 'backward')
          }}
        />
        <Field.ErrorText>{refusal(providers)}</Field.ErrorText>
      </Field>
    </form>
  )
}

type EditorEmbedPopoverProps = {
  editor: TiptapEditor | null
  providers: readonly EmbedProvider[]
  resolveUrl: ((url: string) => Promise<string>) | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Leaves the embed selected as it closes, as when opened from the keyboard. */
  keepSelected?: boolean
}

/**
 * Embeds a video or track from a pasted share link at the selection, or
 * changes the selected embed's as it's typed, which undo puts back.
 */
export function EditorEmbedPopover({
  editor,
  providers,
  resolveUrl,
  open,
  onOpenChange,
  keepSelected = false
}: EditorEmbedPopoverProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const phone = useOnPhone()
  const live = useLiveEdit(editor, open, onOpenChange, {
    keepSelected: keepSelected && !phone
  })
  // From the editor's state as it changes: a read of the mutable editor in
  // render would be cached by the editor alone.
  const editing = useEditorState({
    editor,
    selector: ({ editor: current }) =>
      current ? selectedEmbed(current) !== null : false
  })
  if (!editor) return null
  const { from, to } = editor.state.selection
  // The element lets the popover follow a scrolling container around the editor.
  const anchor = {
    getBoundingClientRect: () => {
      const dom = editing ? editor.view.nodeDOM(from) : null
      return dom instanceof HTMLElement
        ? dom.getBoundingClientRect()
        : posToDOMRect(editor.view, from, to)
    },
    contextElement: editor.view.dom
  }
  // At once, so an undo straight after lands in the editor.
  const handBack = () => {
    focusEditor(editor)
    return false
  }
  const firstFocus = () => inputRef.current
  if (editing) {
    return (
      <EditorSettingsPopup
        title='Embed settings'
        open={open}
        live={live}
        anchor={anchor}
        initialFocus={firstFocus}
        finalFocus={handBack}
      >
        <EmbedSettingsForm
          key={from}
          editor={editor}
          providers={providers}
          resolveUrl={resolveUrl}
          inputRef={inputRef}
          apply={live.apply}
          revert={live.revert}
          onDone={live.done}
        />
      </EditorSettingsPopup>
    )
  }
  return (
    <Popover open={open} onOpenChange={live.onOpenChange}>
      <Popover.Content
        data-editor-popup=''
        side='bottom'
        align='start'
        className={EDITOR_POPOVER_CLASS}
        positionerProps={{ anchor }}
        initialFocus={firstFocus}
        finalFocus={handBack}
      >
        <AddEmbedForm
          editor={editor}
          providers={providers}
          resolveUrl={resolveUrl}
          inputRef={inputRef}
          onDone={live.done}
        />
      </Popover.Content>
    </Popover>
  )
}
