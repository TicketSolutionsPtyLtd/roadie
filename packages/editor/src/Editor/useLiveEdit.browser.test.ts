import { Editor } from '@tiptap/core'
import { afterEach, describe, expect, it } from 'vitest'

import { presets } from '../schema'
import { setSelectedAttrs } from './useLiveEdit'

let editor: Editor | undefined

afterEach(() => editor?.destroy())

describe('setSelectedAttrs', () => {
  it('does nothing once the selection has moved off the node', () => {
    editor = new Editor({
      extensions: presets.rich,
      content: '<p>Sold out</p>'
    })
    editor.commands.setTextSelection(2)
    const before = editor.getJSON()

    expect(setSelectedAttrs({ alt: 'The crowd' })(editor.chain()).run()).toBe(
      false
    )
    expect(editor.getJSON()).toEqual(before)
  })
})
