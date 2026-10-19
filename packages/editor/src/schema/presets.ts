import type { Extensions } from '@tiptap/core'
import { Heading } from '@tiptap/extension-heading'
import {
  Table,
  TableCell,
  TableHeader,
  TableRow
} from '@tiptap/extension-table'
import { StarterKit } from '@tiptap/starter-kit'

import { SafeLink, basic, notInStarterKit } from './basicPreset'
import { Embed } from './embedNode'
import { headingLevel } from './headings'
import { Image } from './image'
import type { Preset } from './presetShapes'

// The page owns h1, so pasted h1 becomes h2 and h5 and h6 become h4.
const RichHeading = Heading.extend({
  addAttributes() {
    return { level: { default: 2, rendered: false } }
  },
  parseHTML() {
    return [1, 2, 3, 4, 5, 6].map((level) => ({
      tag: `h${level}`,
      attrs: { level: headingLevel(level) }
    }))
  }
}).configure({ levels: [2, 3, 4] })

// A cell saves only its spans: widths and alignment are the renderer's call,
// and it holds paragraphs only, so no table, list or image sits in a cell.
const cellSpec = {
  content: 'paragraph+',
  addAttributes() {
    return { colspan: { default: 1 }, rowspan: { default: 1 } }
  }
}

// Each name and attribute these extensions produce is saved in `EditorValue`,
// so changing one bumps CURRENT_VERSION and adds a migrate step.
const rich: Extensions = [
  StarterKit.configure({ ...notInStarterKit, heading: false }),
  RichHeading,
  SafeLink,
  Image,
  Embed,
  Table.configure({ resizable: false }),
  TableRow,
  TableHeader.extend(cellSpec),
  TableCell.extend(cellSpec)
]

export const presets = { basic, rich } as const satisfies Record<
  Preset,
  Extensions
>

export type { Preset }
