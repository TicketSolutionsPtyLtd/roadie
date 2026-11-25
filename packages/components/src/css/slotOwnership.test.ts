/// <reference types="node" />
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// A sheet styles only its own component's slots, so a reader finds a part's
// CSS from its `data-slot` prefix, or knows there is none.
const OWNER: Record<string, string> = {
  'callout.css': 'callout',
  'card-direction.css': 'card',
  'card-ticket.css': 'card',
  'collapsible-text.css': 'collapsible',
  'dashboard.css': 'dashboard',
  'data-table.css': 'data-table',
  'navigator-pending.css': 'navigator',
  'number-field.css': 'number-field',
  'pane-columns.css': 'pane',
  'pane-measure.css': 'pane',
  'pane-print.css': 'pane',
  'records-pane.css': 'records'
}

// Each exception says why, or which ticket removes it.
const ALLOWED: Record<string, Record<string, string>> = {
  'pane-columns.css': {
    navigator: "Navigator is the frame Pane's columns are laid out in",
    'navigator-content':
      "Navigator is the frame Pane's columns are laid out in",
    'navigator-page-ghost':
      "Navigator is the frame Pane's columns are laid out in",
    'navigator-panes': "Navigator is the frame Pane's columns are laid out in",
    'navigator-primary': "Navigator is the frame Pane's columns are laid out in"
  },
  'pane-measure.css': {
    'scroll-area-content': "Pane's body scrolls in a ScrollArea (INNO-1696)"
  },
  'pane-print.css': {
    navigator: "The frame's paper flow",
    'navigator-content': "The frame's paper flow",
    'navigator-panes': "The frame's paper flow",
    'navigator-page-ghost': 'Hidden on paper until it says so (INNO-1732)',
    'navigator-pending': 'Hidden on paper until it says so (INNO-1732)',
    'navigator-primary': 'Hidden on paper until it says so (INNO-1732)',
    'scroll-area-scrollbar': 'Hidden on paper until it says so (INNO-1732)',
    'toast-viewport': 'Hidden on paper until it says so (INNO-1732)'
  },
  'records-pane.css': {
    pane: 'How records sit in a pane is the point of the sheet',
    'pane-body': 'How records sit in a pane is the point of the sheet',
    'pane-viewport': 'How records sit in a pane is the point of the sheet',
    'scroll-area-content':
      'How records sit in a pane is the point of the sheet',
    'record-table-content': "RecordTable is Records' table view",
    'record-table-frame': "RecordTable is Records' table view"
  }
}

// jsdom's import.meta.url isn't a file URL, and `?raw` empties a CSS import.
const directory = import.meta.dirname ?? join(process.cwd(), 'src/css')
const sheets = readdirSync(directory).filter(
  (file) => file.endsWith('.css') && file !== 'components.css'
)

const slotsIn = (sheet: string) =>
  new Set(
    readFileSync(join(directory, sheet), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .matchAll(/data-slot\s*[~|^$*]?=\s*['"]?([\w-]+)/g)
      .map(([, slot]) => slot!)
  )

const owns = (owner: string, slot: string) =>
  slot === owner || slot.startsWith(`${owner}-`)

describe('component sheets style only their own slots', () => {
  it.each(sheets)('%s has an owning component', (sheet) => {
    expect(OWNER[sheet]).toBeDefined()
  })

  it.each(sheets)("%s styles only its component's slots", (sheet) => {
    const owner = OWNER[sheet] ?? ''
    const foreign = [...slotsIn(sheet)].filter(
      (slot) => !owns(owner, slot) && !Object.hasOwn(ALLOWED[sheet] ?? {}, slot)
    )
    expect(foreign).toEqual([])
  })

  it.each(sheets.filter((sheet) => sheet in ALLOWED))(
    '%s still uses every slot it is allowed',
    (sheet) => {
      const slots = slotsIn(sheet)
      const unused = Object.keys(ALLOWED[sheet]!).filter(
        (slot) => !slots.has(slot)
      )
      expect(unused).toEqual([])
    }
  )
})
