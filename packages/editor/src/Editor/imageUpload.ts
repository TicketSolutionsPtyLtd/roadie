import { Extension } from '@tiptap/core'
import {
  type EditorState,
  Plugin,
  PluginKey,
  type Transaction
} from '@tiptap/pm/state'
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view'

import { isEmailImageSrc } from '../schema/emailAttrs'
import { isSafeImageSrc } from '../schema/imageSrc'

export type UploadImage = (file: File) => Promise<{ src: string; alt?: string }>

export type ImageUploadOptions = {
  /** The latest `onUploadImage`, read when a file arrives. */
  upload: () => UploadImage | undefined
  onError: (message: string | null) => void
  /** Accepts only https sources, as for an email, which loads its images in a mail client. */
  httpsOnly?: boolean
}

type Upload = { id: object }
type UploadMeta = { add: Upload & { pos: number } } | { remove: Upload }

const uploads = new PluginKey<DecorationSet>('imageUploads')

const UNUSABLE_SRC =
  'The image couldn’t be added, as it isn’t served over https or from this site.'
const NOT_HTTPS =
  'The image couldn’t be added, as an email’s images must be served over https.'
const FAILED = 'The image couldn’t be uploaded. Try again.'

function placeholder() {
  const element = document.createElement('div')
  element.setAttribute('role', 'status')
  element.setAttribute('aria-label', 'Uploading image')
  element.dataset.slot = 'editor-image-uploading'
  element.className =
    'grid min-h-24 place-items-center rounded-lg bg-subtle text-sm text-subtle'
  element.textContent = 'Uploading image…'
  return element
}

function placeholderPos(state: EditorState, id: object) {
  return uploads
    .getState(state)
    ?.find(undefined, undefined, (spec) => spec.id === id)[0]?.from
}

export function imageFiles(files: FileList | undefined | null) {
  return Array.from(files ?? []).filter((file) =>
    file.type.startsWith('image/')
  )
}

type UploadedImage = { src: string; alt: string }
type Place = (tr: Transaction, at: number, image: UploadedImage) => void

const insertImage: Place = (tr, at, image) => {
  tr.replaceRangeWith(at, at, tr.doc.type.schema.nodes.image!.create(image))
}

const replaceImageAt: Place = (tr, at, { src, alt }) => {
  const image = tr.doc.nodeAt(at)
  if (image?.type.name !== 'image') return
  tr.setNodeMarkup(at, undefined, { src, alt: String(image.attrs.alt) || alt })
}

function upload(
  view: EditorView,
  files: readonly File[],
  pos: number,
  { upload: current, onError, httpsOnly = false }: ImageUploadOptions,
  place: Place
) {
  const uploadImage = current()
  if (!uploadImage) return
  onError(null)
  for (const file of files) {
    const id = {}
    const meta: UploadMeta = { add: { id, pos } }
    view.dispatch(view.state.tr.setMeta(uploads, meta))
    const settle = (image?: UploadedImage) => {
      if (view.isDestroyed) return
      const at = placeholderPos(view.state, id)
      if (at === undefined) return
      const remove: UploadMeta = { remove: { id } }
      const tr = view.state.tr.setMeta(uploads, remove)
      if (image) place(tr, at, image)
      view.dispatch(tr)
    }
    // The executor turns a synchronous throw into a rejection, so the placeholder still settles.
    new Promise<Awaited<ReturnType<UploadImage>>>((resolve) => {
      resolve(uploadImage(file))
    }).then(
      ({ src, alt = '' }) => {
        const usable = httpsOnly ? isEmailImageSrc(src) : isSafeImageSrc(src)
        if (usable) {
          settle({ src, alt })
          return
        }
        settle()
        onError(httpsOnly ? NOT_HTTPS : UNUSABLE_SRC)
      },
      (error: unknown) => {
        settle()
        onError(
          error instanceof Error && error.message ? error.message : FAILED
        )
      }
    )
  }
}

/** Uploads image files to `pos`, behind a placeholder that never reaches the saved value. */
export function uploadImages(
  view: EditorView,
  files: readonly File[],
  pos: number,
  options: ImageUploadOptions
) {
  upload(view, files, pos, options, insertImage)
}

/** Uploads a file to replace the image at `pos`, keeping its alt text. */
export function replaceImage(
  view: EditorView,
  file: File,
  pos: number,
  options: ImageUploadOptions
) {
  upload(view, [file], pos, options, replaceImageAt)
}

/** Sends pasted and dropped image files through `onUploadImage`, or ignores them. */
export const ImageUpload = Extension.create<ImageUploadOptions>({
  name: 'imageUpload',

  addOptions() {
    return { upload: () => undefined, onError: () => {}, httpsOnly: false }
  },

  addProseMirrorPlugins() {
    const options = this.options
    return [
      new Plugin<DecorationSet>({
        key: uploads,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, set) {
            const mapped = set.map(tr.mapping, tr.doc)
            const meta = tr.getMeta(uploads) as UploadMeta | undefined
            if (!meta) return mapped
            if ('add' in meta) {
              const { id, pos } = meta.add
              return mapped.add(tr.doc, [
                Decoration.widget(pos, placeholder, { id, side: -1 })
              ])
            }
            return mapped.remove(
              mapped.find(
                undefined,
                undefined,
                (spec) => spec.id === meta.remove.id
              )
            )
          }
        },
        props: {
          decorations: (state) => uploads.getState(state),
          handlePaste(view, event) {
            const files = imageFiles(event.clipboardData?.files)
            if (files.length === 0 || !options.upload()) return false
            uploadImages(view, files, view.state.selection.from, options)
            return true
          },
          handleDrop(view, event, _slice, moved) {
            const files = imageFiles(event.dataTransfer?.files)
            if (moved || files.length === 0) return false
            const pos = view.posAtCoords({
              left: event.clientX,
              top: event.clientY
            })?.pos
            uploadImages(view, files, pos ?? view.state.selection.from, options)
            // Without an upload, returning true still stops the browser opening the file.
            return true
          }
        }
      })
    ]
  }
})
