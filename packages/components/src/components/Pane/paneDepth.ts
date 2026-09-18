import type { PaneColumn } from './variants'

export type PaneDepth = 0 | 1 | 2 | 3

export const PANE_MAX_DEPTH = 3
export const PANE_MAX_LEVELS = 2
// Named, not the number: Chrome drops every `data-depth` rule for a value no selector names.
export const PANE_DEEP = 'deep'

export const COLUMN_DEPTH: Record<PaneColumn, PaneDepth | null> = {
  list: 0,
  detail: 1,
  inspector: null
}
