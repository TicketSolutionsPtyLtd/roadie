'use client'

import { type RefObject, useEffect, useRef, useState } from 'react'

import { UploadSimpleIcon } from '@phosphor-icons/react'
import { posToDOMRect } from '@tiptap/core'
import { NodeSelection } from '@tiptap/pm/state'
import { type Editor as TiptapEditor, useEditorState } from '@tiptap/react'

import { Button } from '@oztix/roadie-components/button'
import { Drawer } from '@oztix/roadie-components/drawer'
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

const WIDTHS = [
  { value: 'full', label: 'Full' },
  { value: 'fit', label: 'Fit' }
] as const

// Start and End are where the text begins and ends, so they swap sides in
// right-to-left text, while the saved values name the physical side.
function alignChoices(editor: TiptapEditor) {
  const rtl = getComputedStyle(editor.view.dom).direction === 'rtl'
  return [
    { value: rtl ? 'right' : 'left', label: 'Start' },
    { value: 'center', label: 'Centre' },
    { value: rtl ? 'left' : 'right', label: 'End' }
  ] as const
}

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
  inputRef: RefObject<HTMLInputElement | null>
  altRef: RefObject<HTMLInputElement | null>
  apply: LiveEdit['apply']
  upload?: () => void
  onDone: () => void
}

/** Applies each change as it's made: a choice at once, a link once it's whole. */
function ImageSettingsForm({
  editor,
  inputRef,
  altRef,
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
            onClick={() => {
              onDone()
              upload()
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
            choices={alignChoices(editor)}
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
            choices={alignChoices(editor)}
            value={page.align ?? alignChoices(editor)[0].value}
            onValueChange={(choice) =>
              changePage({
                align:
                  choice === alignChoices(editor)[0].value || choice === 'left'
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
          ref={altRef}
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
}

/**
 * Adds an image from its link or an upload, or edits the selected image's
 * link, alt text and, in an email, where it links, its width and its
 * alignment. Escape puts an edited image back as it was.
 */
export function EditorImagePopover({
  editor,
  open,
  onOpenChange,
  adding = false,
  pickFile,
  replaceFile
}: EditorImagePopoverProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const altRef = useRef<HTMLInputElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const live = useLiveEdit(editor, open, onOpenChange)
  const phone = useOnPhone()
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
  const settings = image ? (
    <ImageSettingsForm
      key={image.from}
      editor={editor}
      inputRef={inputRef}
      altRef={altRef}
      apply={live.apply}
      upload={replaceFile}
      onDone={live.done}
    />
  ) : null
  const firstFocus = () =>
    image && !image.node.attrs.alt ? altRef.current : inputRef.current
  const handBack = () => {
    focusEditor(editor)
    return false
  }
  // On a phone, from the bottom, as a popover by the image runs off screen.
  if (phone && image) {
    return (
      // No blur, and half the screen, so the image stays in view above it.
      <Drawer
        open={open}
        onOpenChange={live.onOpenChange}
        side='bottom'
        emphasis='subtler'
      >
        <Drawer.Content
          size='sm'
          // Its title, as the keyboard a field brings up would cover the sheet.
          initialFocus={titleRef}
          finalFocus={handBack}
        >
          <Drawer.Header>
            <Drawer.Title ref={titleRef} tabIndex={-1} className='outline-none'>
              Image settings
            </Drawer.Title>
          </Drawer.Header>
          <Drawer.Body className='pb-6'>{settings}</Drawer.Body>
        </Drawer.Content>
      </Drawer>
    )
  }
  return (
    <Popover open={open} onOpenChange={live.onOpenChange}>
      <Popover.Content
        side='bottom'
        align='start'
        className={
          image
            ? 'max-h-(--available-height) w-80 max-w-(--available-width) overflow-y-auto'
            : EDITOR_POPOVER_CLASS
        }
        positionerProps={{ anchor }}
        // An image without alt text needs it most, so that's where typing goes.
        initialFocus={firstFocus}
        finalFocus={handBack}
      >
        {image ? (
          <>
            <Popover.Header>
              <Popover.Title>Image settings</Popover.Title>
            </Popover.Header>
            {settings}
          </>
        ) : (
          <AddImageForm
            editor={editor}
            inputRef={inputRef}
            upload={pickFile}
            onDone={live.done}
          />
        )}
      </Popover.Content>
    </Popover>
  )
}
