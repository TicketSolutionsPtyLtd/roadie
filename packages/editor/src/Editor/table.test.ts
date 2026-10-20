import { getExtensionField, getSchema } from '@tiptap/core'
import { describe, expect, it } from 'vitest'

import { presets } from '../schema'
import { withTableEditing } from './table'

const saved = getSchema(presets.rich)
const edited = getSchema(withTableEditing(presets.rich))

function specOf(name: string, schema: typeof saved) {
  const { spec } = schema.nodes[name]!
  return {
    content: spec.content,
    group: spec.group,
    tableRole: spec.tableRole,
    isolating: spec.isolating,
    attrs: Object.fromEntries(
      Object.entries(spec.attrs ?? {}).map(([attr, { default: value }]) => [
        attr,
        value
      ])
    )
  }
}

describe('withTableEditing', () => {
  it('keeps the saved schema’s nodes and marks', () => {
    expect(Object.keys(edited.nodes)).toEqual(Object.keys(saved.nodes))
    expect(Object.keys(edited.marks)).toEqual(Object.keys(saved.marks))
  })

  it.each(['table', 'tableRow', 'tableHeader', 'tableCell'])(
    'gives the editor’s %s the saved content, roles and attrs',
    (name) => {
      expect(specOf(name, edited)).toEqual(specOf(name, saved))
    }
  )

  it.each(['tableHeader', 'tableCell'])(
    'reads a pasted %s span through the saved schema’s check',
    (name) => {
      const element = {
        children: [{}],
        textContent: '9pm',
        getAttribute: (attr: string) => (attr === 'colspan' ? '1e9' : '2')
      } as unknown as HTMLElement
      const attrsOf = (schema: typeof saved) =>
        (schema.nodes[name]!.spec.parseDOM ?? [])
          .map((rule) => rule.getAttrs?.(element) ?? {})
          .find((attrs) => attrs !== false)

      expect(attrsOf(edited)).toEqual(attrsOf(saved))
      expect(attrsOf(edited)).toEqual({ colspan: 1, rowspan: 2 })
    }
  )

  it('adds table editing without column resizing', () => {
    const table = withTableEditing(presets.rich).find(
      ({ name }) => name === 'table'
    )!

    expect(getExtensionField(table, 'addCommands')).toBeDefined()
    expect(table.options).toMatchObject({ resizable: false, View: null })
  })
})
