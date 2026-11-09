'use client'

import { type RefObject, useEffect, useRef, useState } from 'react'

import { UploadSimpleIcon } from '@phosphor-icons/react'
import { posToDOMRect } from '@tiptap/core'
import { NodeSelection } from '@tiptap/pm/state'
import { type Editor as TiptapEditor, useEditorState } from '@tiptap/react'

import { Button } from '@oztix/roadie-components/button'
import { Field } from '@oztix/roadie-components/field'
import { Fieldset } from '@oztix/roadie-components/fieldset'
import { Popover } from '@oztix/roadie-components/popover'
import { ToggleGroup } from '@oztix/roadie-components/toggle-group'

import {
  EMAIL_WIDTH,
  type ImageLook,
  imageLook,
  imageWidth,
  isEmailImageSrc
} from '../schema/emailAttrs'
import { type PageImageLook, pageImageLook } from '../schema/imageAttrs'
import { isSafeImageSrc } from '../schema/imageSrc'
import {
  EditorLinkTargetFields,
  type LinkTarget
} from './EditorLinkTargetFields'
import { EDITOR_POPOVER_CLASS, EditorPopoverForm } from './EditorPopoverForm'
import { EditorSettingsPopup } from './EditorSettingsPopup'
import { insertBlock } from './emailEditing'
import { focusEditor } from './focusEditor'
import { useOnPhone } from './toolbarMode'
import { type LiveEdit, setSelectedAttrs, useLiveEdit } from './useLiveEdit'

// Email images load in a mail client, so only https reaches one.
const isImageSrc = (editor: TiptapEditor, src: string) =>
  inEmail(editor) ? isEmailImageSrc(src) : isSafeImageSrc(src)

const inEmail = (editor: TiptapEditor) =>
  Boolean(editor.schema.nodes.image?.spec.attrs?.width)

// Into the top half, which a half-height sheet leaves clear.
// A toolbar docked at the top can cover what scrolls under it.
const ABOVE_SHEET_MARGIN = 72

function keepAboveSheet(dom: unknown) {
  if (!(dom instanceof HTMLElement)) return undefined
  const { top, bottom } = dom.getBoundingClientRect()
  if (top >= ABOVE_SHEET_MARGIN && bottom <= window.innerHeight / 2) {
    return undefined
  }
  return requestAnimationFrame(() =>
    scrollerOf(dom).scrollBy({ top: top - ABOVE_SHEET_MARGIN })
  )
}

// The page may scroll in a pane of its own rather than the window.
function scrollerOf(dom: HTMLElement): HTMLElement | Window {
  for (let parent = dom.parentElement; parent; parent = parent.parentElement) {
    const { overflowY } = getComputedStyle(parent)
    const scrolls = overflowY === 'auto' || overflowY === 'scroll'
    if (scrolls && parent.scrollHeight > parent.clientHeight) return parent
  }
  return window
}

const REFUSED = 'Enter an image’s https address.'

const selectedImage = (editor: TiptapEditor) => {
  const { selection } = editor.state
  return selection instanceof NodeSelection &&
    selection.node.type.name === 'image'
    ? selection
    : null
}

type AddImageFormProps = {
  editor: TiptapEditor
  inputRef: RefObject<HTMLInputElement | null>
  upload?: () => void
  onDone: () => void
}

/** Adds an image from its link, or from an upload with `onUploadImage`. */
function AddImageForm({ editor, inputRef, upload, onDone }: AddImageFormProps) {
  const [typed, setTyped] = useState('')
  const [refused, setRefused] = useState(false)

  const save = () => {
    const src = typed.trim()
    if (!isImageSrc(editor, src)) {
      setRefused(true)
      return false
    }
    const image = { type: 'image', attrs: { src, alt: '' } }
    const chain = editor.chain().focus()
    // An email's image is a block of its own, after the caret's line.
    if (inEmail(editor)) chain.command(insertBlock(image))
    else chain.setImage({ src })
    chain.run()
    onDone()
    return true
  }

  return (
    <div className='grid gap-2'>
      {upload ? (
        <Button
          emphasis='subtle'
          className='w-full'
          onClick={() => {
            onDone()
            upload()
          }}
        >
          <UploadSimpleIcon weight='bold' className='size-4' aria-hidden />
          Upload an image
        </Button>
      ) : null}
      <EditorPopoverForm
        label='Image address'
        inputRef={inputRef}
        type='url'
        inputMode='url'
        placeholder='Paste an image address'
        value={typed}
        onValueChange={(value) => {
          setTyped(value)
          setRefused(false)
        }}
        submitLabel='Add image'
        onSubmit={save}
        invalid={refused}
        error={REFUSED}
      />
    </div>
  )
}

type Choice<Value extends string> = { value: Value; label: string }

type ChoiceProps<Value extends string> = {
  legend: string
  choices: readonly Choice<Value>[]
  value: Value
  onValueChange: (value: Value) => void
  disabled?: boolean
  helperText?: string | null
}

function ImageChoice<Value extends string>({
  legend,
  choices,
  value,
  onValueChange,
  disabled,
  helperText
}: ChoiceProps<Value>) {
  return (
    <Fieldset className='grid gap-1.5 [&>*+*]:mt-0' disabled={disabled}>
      {/* A label's size, as the fields', not a section's. */}
      <Fieldset.Legend className='text-sm font-medium text-normal'>
        {legend}
      </Fieldset.Legend>
      <ToggleGroup
        value={[value]}
        // Pressing the chosen item again would leave none, so it's ignored.
        onValueChange={([chosen]) => {
          if (chosen) onValueChange(chosen as Value)
        }}
        disabled={disabled}
        className='w-full'
      >
        {choices.map((choice) => (
          <ToggleGroup.Item
            key={choice.value}
            value={choice.value}
            className='flex-1'
          >
            {choice.label}
          </ToggleGroup.Item>
        ))}
      </ToggleGroup>
      {helperText ? (
        <Fieldset.HelperText>{helperText}</Fieldset.HelperText>
      ) : null}
    </Fieldset>
  )
}

// As Button settings names them.
const WIDTHS = [
  { value: 'fit', label: 'Fit' },
  { value: 'full', label: 'Full width' }
] as const

const ALIGNS = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Centre' },
  { value: 'right', label: 'Right' }
] as const

// Where a page image sits with no align saved: the text's start.
const startSide = (editor: TiptapEditor) =>
  getComputedStyle(editor.view.dom).direction === 'rtl' ? 'right' : 'left'

type Saved = {
  src: string
  alt: string
  width: number | null
  look: ImageLook
  page: PageImageLook
}

function savedImage(editor: TiptapEditor): Saved {
  const { attrs } = selectedImage(editor)!.node
  return {
    src: String(attrs.src ?? ''),
    alt: typeof attrs.alt === 'string' ? attrs.alt : '',
    width: imageWidth(attrs.width),
    look: imageLook(attrs),
    page: pageImageLook(attrs)
  }
}

// Its own width at most, up to the email's, or half the email's until it loads.
function fitWidth(editor: TiptapEditor) {
  const dom = editor.view.nodeDOM(editor.state.selection.from)
  const img = dom instanceof HTMLElement ? dom.querySelector('img') : null
  return Math.min(img?.naturalWidth || EMAIL_WIDTH / 2, EMAIL_WIDTH)
}

type ImageSettingsFormProps = {
  editor: TiptapEditor
  formRef: RefObject<HTMLFormElement | null>
  inputRef: RefObject<HTMLInputElement | null>
  apply: LiveEdit['apply']
  upload?: () => void
  onDone: () => void
}

/** Applies each change as it's made: a choice at once, a link once it's whole. */
function ImageSettingsForm({
  editor,
  formRef,
  inputRef,
  apply: applyLive,
  upload,
  onDone
}: ImageSettingsFormProps) {
  // Read as the form opens: the editor is mutable, so the React Compiler
  // would cache a read during render by the editor alone.
  const [saved] = useState(() => savedImage(editor))
  const [src, setSrc] = useState(saved.src)
  const [refused, setRefused] = useState(false)
  const [alt, setAlt] = useState(saved.alt)
  const [width, setWidth] = useState(saved.width)
  const [align, setAlign] = useState(saved.look.align)
  const [page, setPage] = useState(saved.page)
  const [caption, setCaption] = useState(saved.page.caption ?? '')
  const email = inEmail(editor)

  // A page's image saves only what isn't its own width from the start.
  const changePage = (change: PageImageLook) => {
    const next = { ...page, ...change }
    setPage(next)
    apply({
      fullWidth: next.fullWidth,
      align: next.fullWidth ? undefined : next.align
    })
  }

  const apply = (attrs: Record<string, unknown>) =>
    applyLive(setSelectedAttrs(attrs))

  // Once it's left, as every part-typed address would load an image.
  const applySrc = () => {
    const whole = isImageSrc(editor, src.trim())
    setRefused(!whole)
    if (whole && src.trim() !== saved.src) apply({ src: src.trim() })
  }

  return (
    <form
      ref={formRef}
      noValidate
      className='grid gap-4'
      onSubmit={(event) => {
        event.preventDefault()
        // React bubbles a portalled submit to the form around the editor.
        event.stopPropagation()
        applySrc()
        onDone()
      }}
    >
      <Field invalid={refused}>
        <Field.Label>Image address</Field.Label>
        <Field.Input
          ref={inputRef}
          type='url'
          inputMode='url'
          value={src}
          onChange={(event) => {
            const value = event.target.value
            setSrc(value)
            setRefused(false)
          }}
          onKeyDown={(event) => {
            // Escape closes it before the field blurs, so it's left here.
            if (event.key === 'Escape') applySrc()
            if (event.key !== 'Enter') return
            event.preventDefault()
            // The Enter that picks an IME candidate only ends the composition.
            const composing =
              event.nativeEvent.isComposing || event.keyCode === 229
            if (!composing) event.currentTarget.form?.requestSubmit()
          }}
          // Says so only once they've moved on, not while they type.
          onBlur={applySrc}
        />
        <Field.ErrorText>{REFUSED}</Field.ErrorText>
        {upload ? (
          <Button
            size='sm'
            emphasis='subtler'
            className='justify-self-start'
            // Before it closes, while the image is still the one selected.
            onClick={() => {
              upload()
              onDone()
            }}
          >
            <UploadSimpleIcon weight='bold' className='size-4' aria-hidden />
            Upload a new image
          </Button>
        ) : null}
      </Field>
      {email ? (
        <EditorLinkTargetFields
          editor={editor}
          target={saved.look}
          optional
          onTargetChange={({ href, variable }: LinkTarget) =>
            apply({ href, variable })
          }
        />
      ) : null}
      {email ? (
        <>
          <ImageChoice
            legend='Width'
            choices={WIDTHS}
            value={width === null ? 'full' : 'fit'}
            onValueChange={(choice) => {
              const next = choice === 'full' ? null : fitWidth(editor)
              setWidth(next)
              apply({ width: next })
            }}
          />
          <ImageChoice
            legend='Align'
            choices={ALIGNS}
            value={align ?? 'center'}
            onValueChange={(choice) => {
              const next = choice === 'center' ? undefined : choice
              setAlign(next)
              apply({ align: next })
            }}
            disabled={width === null}
            helperText={
              width === null ? 'A full image spans its column.' : null
            }
          />
        </>
      ) : (
        <>
          <ImageChoice
            legend='Width'
            choices={WIDTHS}
            value={page.fullWidth ? 'full' : 'fit'}
            onValueChange={(choice) =>
              changePage({ fullWidth: choice === 'full' || undefined })
            }
          />
          <ImageChoice
            legend='Align'
            // A page image saves only centre or right, so in right-to-left
            // text, where its start is the right, it can't sit left.
            choices={
              startSide(editor) === 'right'
                ? ALIGNS.filter(({ value }) => value !== 'left')
                : ALIGNS
            }
            value={page.align ?? startSide(editor)}
            onValueChange={(choice) =>
              changePage({
                align:
                  choice === startSide(editor) || choice === 'left'
                    ? undefined
                    : choice
              })
            }
            disabled={page.fullWidth}
            helperText={page.fullWidth ? 'A full image spans the text.' : null}
          />
          <Field>
            <Field.Label>Caption</Field.Label>
            <Field.Input
              value={caption}
              placeholder='None'
              onChange={(event) => {
                setCaption(event.target.value)
                apply({ caption: event.target.value.trim() || undefined })
              }}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return
                event.preventDefault()
                const composing =
                  event.nativeEvent.isComposing || event.keyCode === 229
                if (!composing) event.currentTarget.form?.requestSubmit()
              }}
            />
          </Field>
        </>
      )}
      <Field>
        <Field.Label>Alt text</Field.Label>
        <Field.Input
          value={alt}
          placeholder='Describe the image'
          onChange={(event) => {
            setAlt(event.target.value)
            apply({ alt: event.target.value.trim() })
          }}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return
            event.preventDefault()
            const composing =
              event.nativeEvent.isComposing || event.keyCode === 229
            if (!composing) event.currentTarget.form?.requestSubmit()
          }}
        />
        <Field.HelperText>
          What a screen reader says, and what shows if it doesn’t load.
        </Field.HelperText>
      </Field>
    </form>
  )
}

type EditorImagePopoverProps = {
  editor: TiptapEditor | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Adds an image, whether or not one is selected. */
  adding?: boolean
  /** Opens the file picker for a new image, with `onUploadImage`. */
  pickFile?: () => void
  /** Opens the file picker to replace the selected image, with `onUploadImage`. */
  replaceFile?: () => void
  /** Leaves the image selected as it closes, as when opened from the keyboard. */
  keepSelected?: boolean
}

/**
 * Adds an image from its link or an upload, or edits the selected image's
 * link, alt text and, in an email, where it links, its width and its
 * alignment, each as it's made. Undo puts an edited image back as it was.
 */
export function EditorImagePopover({
  editor,
  open,
  onOpenChange,
  adding = false,
  pickFile,
  replaceFile,
  keepSelected = false
}: EditorImagePopoverProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const phone = useOnPhone()
  const live = useLiveEdit(editor, open, onOpenChange, {
    keepSelected: keepSelected && !phone
  })
  // From the editor's state as it changes: a read of the mutable editor in
  // render would be cached by the editor alone.
  const selected = useEditorState({
    editor,
    selector: ({ editor: current }) => (current ? selectedImage(current) : null)
  })
  const sheetFor = open && phone && !adding ? (selected?.from ?? null) : null
  useEffect(() => {
    if (!editor || sheetFor === null) return
    const frame = keepAboveSheet(editor.view.nodeDOM(sheetFor))
    return () => {
      if (frame !== undefined) cancelAnimationFrame(frame)
    }
  }, [editor, sheetFor])
  if (!editor) return null
  const image = adding ? null : selected
  const { from, to } = editor.state.selection
  // Read as it's placed, as a live edit redraws the image under it. The
  // element lets the popover follow a scrolling container around the editor.
  const anchor = {
    getBoundingClientRect: () => {
      const dom = image ? editor.view.nodeDOM(image.from) : null
      return dom instanceof HTMLElement
        ? dom.getBoundingClientRect()
        : posToDOMRect(editor.view, from, to)
    },
    contextElement: editor.view.dom
  }
  // The first style choice, which brings up no keyboard; adding, the address.
  const firstFocus = () =>
    formRef.current?.querySelector<HTMLElement>(
      'fieldset [aria-pressed="true"]'
    ) ?? inputRef.current
  const handBack = () => {
    focusEditor(editor)
    return false
  }
  if (image) {
    return (
      <EditorSettingsPopup
        title='Image settings'
        open={open}
        live={live}
        anchor={anchor}
        initialFocus={firstFocus}
        finalFocus={handBack}
      >
        <ImageSettingsForm
          key={image.from}
          editor={editor}
          formRef={formRef}
          inputRef={inputRef}
          apply={live.apply}
          upload={replaceFile}
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
        <AddImageForm
          editor={editor}
          inputRef={inputRef}
          upload={pickFile}
          onDone={live.done}
        />
      </Popover.Content>
    </Popover>
  )
}
