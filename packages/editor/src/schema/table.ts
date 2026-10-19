import { Node } from '@tiptap/core'

import { spanAttribute } from './spans'

// The roles prosemirror-tables reads off each node's spec.
const TABLE_ROLES: Record<string, string> = {
  table: 'table',
  tableRow: 'row',
  tableHeader: 'header_cell',
  tableCell: 'cell'
}

// Tiptap's table nodes, without the prosemirror-tables editing they bring:
// the editor adds that, so the saved schema and the renderers stay light.
export const Table = Node.create({
  name: 'table',
  group: 'block',
  content: 'tableRow+',
  isolating: true,
  extendNodeSchema: ({ name }) =>
    Object.hasOwn(TABLE_ROLES, name) ? { tableRole: TABLE_ROLES[name] } : {},
  parseHTML: () => [{ tag: 'table' }],
  renderHTML: ({ HTMLAttributes }) => ['table', HTMLAttributes, ['tbody', 0]]
})

export const TableRow = Node.create({
  name: 'tableRow',
  content: '(tableCell | tableHeader)*',
  parseHTML: () => [{ tag: 'tr' }],
  renderHTML: ({ HTMLAttributes }) => ['tr', HTMLAttributes, 0]
})

// A cell saves only its spans: widths and alignment are the renderer's call,
// and it holds paragraphs only, so no table, list or image sits in a cell.
export const cellSpec = {
  content: 'paragraph+',
  isolating: true,
  addAttributes: () => ({
    colspan: spanAttribute('colspan'),
    rowspan: spanAttribute('rowspan')
  })
}

export const TableHeader = Node.create({
  name: 'tableHeader',
  ...cellSpec,
  parseHTML: () => [{ tag: 'th' }],
  renderHTML: ({ HTMLAttributes }) => ['th', HTMLAttributes, 0]
})

export const TableCell = Node.create({
  name: 'tableCell',
  ...cellSpec,
  parseHTML: () => [{ tag: 'td' }],
  renderHTML: ({ HTMLAttributes }) => ['td', HTMLAttributes, 0]
})
