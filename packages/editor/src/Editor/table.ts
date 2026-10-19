import type { EditorState } from '@tiptap/pm/state'
import { isInTable, selectedRect } from '@tiptap/pm/tables'

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
