import { act, renderHook } from '@testing-library/react'
import { Editor, Extension } from '@tiptap/core'
import { Plugin } from '@tiptap/pm/state'
import { afterEach, describe, expect, it } from 'vitest'

import { presets } from '../schema'
import { setSelectedAttrs, useLiveEdit } from './useLiveEdit'

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

const links = (on: Editor) => {
  const found: string[] = []
  on.state.doc.descendants((node) => {
    const link = node.marks.find((mark) => mark.type.name === 'link')
    if (link) found.push(`${node.text} ${link.attrs.href}`)
  })
  return found
}

// The caret sits in "tickets", which runs from 5 to 12.
function relinkTickets(...extensions: Extension[]) {
  const on = new Editor({
    extensions: [...presets.rich, ...extensions],
    content: '<p>Get <a href="https://a.test/">tickets</a></p>'
  })
  editor = on
  on.commands.setTextSelection(7)
  const { result } = renderHook(() => useLiveEdit(on, true, () => {}))
  act(() =>
    result.current.apply((chain) =>
      chain.extendMarkRange('link').setMark('link', { href: 'https://b.test/' })
    )
  )
  return { on, live: result.current }
}

describe('useLiveEdit after a change from outside the popover', () => {
  it('puts the link and the caret back where the text moved to', () => {
    const { on, live } = relinkTickets()
    on.commands.insertContentAt(1, 'Now on. ')

    act(() => live.revert())

    expect(links(on)).toEqual(['tickets https://a.test/'])
    expect(on.state.selection.from).toBe(15)
  })

  it('follows a change a plugin appends', () => {
    const prepend = Extension.create({
      name: 'prepend',
      addProseMirrorPlugins: () => [
        new Plugin({
          appendTransaction: (transactions, _, state) =>
            transactions.some((tr) => tr.getMeta('prepend'))
              ? state.tr.insertText('Now on. ', 1)
              : null
        })
      ]
    })
    const { on, live } = relinkTickets(prepend)
    on.view.dispatch(on.state.tr.setMeta('prepend', true))

    act(() => live.revert())

    expect(links(on)).toEqual(['tickets https://a.test/'])
  })

  it('reverts nothing once the text it linked is gone', () => {
    const { on, live } = relinkTickets()
    on.commands.deleteRange({ from: 5, to: 12 })

    act(() => live.revert())

    expect(on.getText()).toBe('Get ')
    expect(links(on)).toEqual([])
  })

  it('keeps the change on the moved text as one undo step', () => {
    const { on, live } = relinkTickets()
    on.commands.insertContentAt(1, 'Now on. ')

    act(() => live.done())
    expect(links(on)).toEqual(['tickets https://b.test/'])

    on.commands.undo()
    expect(on.getText()).toBe('Now on. Get tickets')
    expect(links(on)).toEqual(['tickets https://a.test/'])
  })
})

describe('useLiveEdit', () => {
  it('takes out an edit that moves positions', () => {
    const on = new Editor({ extensions: presets.rich, content: '<p>Get</p>' })
    editor = on
    const { result } = renderHook(() => useLiveEdit(on, true, () => {}))
    act(() => result.current.apply((chain) => chain.insertContentAt(1, 'X')))

    act(() => result.current.revert())

    expect(on.getText()).toBe('Get')
  })
})
