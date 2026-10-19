import type { Extensions } from '@tiptap/core'
import {
  Table,
  TableCell,
  TableHeader,
  TableRow
} from '@tiptap/extension-table'
import type { DOMOutputSpec } from '@tiptap/pm/model'
import { type EditorState, Plugin } from '@tiptap/pm/state'
import { isInTable, selectedRect } from '@tiptap/pm/tables'

import { cellSpec } from '../schema/table'

// In a `.prose-scroll`, as the renderers draw it, so a wide table scrolls
// in the editor too, and with no widths, as tables aren't resizable.
const editorTableDom: DOMOutputSpec = [
  'div',
  { class: 'prose-scroll' },
  ['table', ['tbody', 0]]
]

const BLOCK = 'p, div, h1, h2, h3, h4, h5, h6, ul, ol, blockquote, table'

// A cell holds paragraphs only, so ProseMirror would close a cell at a list
// and put the list after the table. Each item becomes a paragraph instead.
export function cellListsAsParagraphs(html: string) {
  const template = document.createElement('template')
  template.innerHTML = html
  const { content } = template
  for (const item of [
    ...content.querySelectorAll(':is(td, th) li')
  ].reverse()) {
    const holdsBlocks = [...item.children].some((child) => child.matches(BLOCK))
    if (holdsBlocks) {
      item.replaceWith(...item.childNodes)
      continue
    }
    const paragraph = document.createElement('p')
    paragraph.append(...item.childNodes)
    item.replaceWith(paragraph)
  }
  for (const list of [
    ...content.querySelectorAll(':is(td, th) :is(ul, ol)')
  ].reverse()) {
    list.replaceWith(...list.childNodes)
  }
  return template.innerHTML
}

const EditingTable = Table.extend({
  renderHTML: () => editorTableDom,
  addProseMirrorPlugins() {
    return [
      ...(this.parent?.() ?? []),
      new Plugin({ props: { transformPastedHTML: cellListsAsParagraphs } })
    ]
  }
})

// Tiptap's table nodes, which bring prosemirror-tables' cell selection, Tab
// between cells and row and column commands, in place of the saved schema's
// plain ones. With no View, Tiptap's table view, which writes widths, stays
// out.
const EDITING_TABLE_NODES: Record<string, Extensions[number]> = {
  table: EditingTable.configure({ resizable: false, View: null }),
  tableRow: TableRow,
  tableHeader: TableHeader.extend(cellSpec),
  tableCell: TableCell.extend(cellSpec)
}

export function withTableEditing(extensions: Extensions): Extensions {
  return extensions.map((extension) =>
    Object.hasOwn(EDITING_TABLE_NODES, extension.name)
      ? EDITING_TABLE_NODES[extension.name]!
      : extension
  )
}

/** The table holding the selection, with the position before it. */
export function selectedTable({ selection: { $from } }: EditorState) {
  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth)
    if (node.type.name === 'table') return { node, pos: $from.before(depth) }
  }
  return undefined
}

export function hasHeaderRow(state: EditorState) {
  const firstRow = selectedTable(state)?.node.firstChild
  if (!firstRow || firstRow.childCount === 0) return false
  let allHeaders = true
  firstRow.forEach((cell) => {
    if (cell.type.name !== 'tableHeader') allHeaders = false
  })
  return allHeaders
}

// Deleting every row or column would leave no table, so the commands refuse
// it, but only once run.
export function leavesARow(state: EditorState) {
  if (!isInTable(state)) return false
  const { top, bottom, map } = selectedRect(state)
  return top > 0 || bottom < map.height
}

export function leavesAColumn(state: EditorState) {
  if (!isInTable(state)) return false
  const { left, right, map } = selectedRect(state)
  return left > 0 || right < map.width
}
