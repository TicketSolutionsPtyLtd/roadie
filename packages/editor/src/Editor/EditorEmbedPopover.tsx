'use client'

import { type RefObject, useEffect, useRef, useState } from 'react'

import { posToDOMRect } from '@tiptap/core'
import { NodeSelection } from '@tiptap/pm/state'
import type { Editor as TiptapEditor } from '@tiptap/react'

import { Popover } from '@oztix/roadie-components/popover'

import {
  type EmbedProvider,
  defaultEmbedProviders,
  embedShareUrl,
  parseEmbedUrl
} from '../schema/embed'
import { type EmbedAttrs, embedAttrs } from '../schema/embedAttrs'
import { EDITOR_POPOVER_CLASS, EditorPopoverForm } from './EditorPopoverForm'
import { type LiveEdit, setSelectedAttrs, useLiveEdit } from './useLiveEdit'

const REFUSED = 'That link can’t be embedded.'
const REFUSED_DEFAULT = `${REFUSED} Use a share link from YouTube, Vimeo, Spotify, SoundCloud, Deezer, Apple Music, or TikTok.`

type EmbedFormProps = {
  editor: TiptapEditor
  providers: readonly EmbedProvider[]
  resolveUrl: ((url: string) => Promise<string>) | undefined
  inputRef: RefObject<HTMLInputElement | null>
  apply: LiveEdit['apply']
  revert: LiveEdit['revert']
  onDone: () => void
}

function selectedEmbed(editor: TiptapEditor): EmbedAttrs | null {
  const { selection } = editor.state
  const isEmbed =
    selection instanceof NodeSelection && selection.node.type.name === 'embed'
  return isEmbed ? embedAttrs(selection.node.attrs) : null
}

/** Changes a selected embed as a link that embeds is typed; adds one on save. */
function EmbedForm({
  editor,
  providers,
  resolveUrl,
  inputRef,
  apply,
  revert,
  onDone
}: EmbedFormProps) {
  // Read as the form opens: the editor is mutable, so the React Compiler
  // would cache a read during render by the editor alone.
  const [selected] = useState(() => selectedEmbed(editor))
  const [typed, setTyped] = useState(() => {
    if (!selected) return ''
    const { params, ...value } = selected
    return embedShareUrl(params ? { ...value, params } : value, providers)
  })
  const [refused, setRefused] = useState(false)
  const [resolving, setResolving] = useState(false)
  const closed = useRef(false)
  useEffect(() => {
    closed.current = false
    return () => {
      closed.current = true
    }
  }, [])

  // In place, so the embed stays selected for the next change.
  const change = (url: string) => {
    const value = parseEmbedUrl(url, providers)
    if (!value) return false
    const { provider, id, params } = value
    apply(setSelectedAttrs({ provider, id, params: params ?? null }))
    return true
  }

  const embed = (url: string) => {
    if (selected) {
      if (!change(url)) return false
    } else {
      const value = parseEmbedUrl(url, providers)
      if (!value) return false
      editor.chain().focus().setEmbed(value).run()
    }
    onDone()
    return true
  }

  const save = async () => {
    const url = typed.trim()
    if (embed(url)) return true
    if (!resolveUrl || !URL.canParse(url)) {
      setRefused(true)
      return false
    }
    setResolving(true)
    const resolved = await resolveUrl(url).catch(() => '')
    // Closing the popover cancels the embed it was resolving.
    if (closed.current) return true
    setResolving(false)
    if (embed(resolved)) return true
    setRefused(true)
    return false
  }

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
        if (selected && !change(value.trim())) revert()
      }}
      submitLabel={selected ? 'Save link' : 'Embed link'}
      onSubmit={save}
      busy={resolving}
      invalid={refused}
      error={providers === defaultEmbedProviders ? REFUSED_DEFAULT : REFUSED}
    />
  )
}

type EditorEmbedPopoverProps = {
  editor: TiptapEditor | null
  providers: readonly EmbedProvider[]
  resolveUrl: ((url: string) => Promise<string>) | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
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
  onOpenChange
}: EditorEmbedPopoverProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const live = useLiveEdit(editor, open, onOpenChange)
  if (!editor) return null
  const { from, to } = editor.state.selection
  const anchor = {
    getBoundingClientRect: () => posToDOMRect(editor.view, from, to)
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
          editor.commands.focus()
          return false
        }}
      >
        <EmbedForm
          editor={editor}
          providers={providers}
          resolveUrl={resolveUrl}
          inputRef={inputRef}
          apply={live.apply}
          revert={live.revert}
          onDone={live.done}
        />
      </Popover.Content>
    </Popover>
  )
}
