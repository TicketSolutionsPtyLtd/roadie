import { Extension } from '@tiptap/core'
import { Plugin } from '@tiptap/pm/state'

export type SourcePasteOptions = {
  /** Opens the import with the pasted source. */
  onSource: (source: string) => void
}

/**
 * Whether pasted text is markup, such as an email's source copied from a code
 * editor, rather than text to paste as it is.
 */
export const isMarkup = (text: string) => /^<[a-z!?][\s\S]*>$/i.test(text)

/** Opens the import for HTML or MJML pasted as text, so it isn't pasted as tags. */
export const SourcePaste = Extension.create<SourcePasteOptions>({
  name: 'sourcePaste',
  // Ahead of the clipboard's own handling, which would paste the tags as text.
  priority: 1000,

  addOptions() {
    return { onSource: () => {} }
  },

  addProseMirrorPlugins() {
    const { onSource } = this.options
    return [
      new Plugin({
        props: {
          handlePaste(_view, event) {
            const text = event.clipboardData?.getData('text/plain').trim()
            if (!text || !isMarkup(text)) return false
            onSource(text)
            return true
          }
        }
      })
    ]
  }
})
