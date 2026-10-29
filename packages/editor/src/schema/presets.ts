import type { Extensions } from '@tiptap/core'
import { Heading } from '@tiptap/extension-heading'
import { UniqueID } from '@tiptap/extension-unique-id'
import { StarterKit } from '@tiptap/starter-kit'

import { SafeLink, basic, notInStarterKit } from './basicPreset'
import { Embed } from './embedNode'
import { headingLevel } from './headings'
import { Image } from './image'
import { BLOCK_ID, BLOCK_ID_TYPES, type Preset } from './presetShapes'
import { Table, TableCell, TableHeader, TableRow } from './table'

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

// Each name and attribute these extensions produce is saved in `EditorValue`,
// so changing one bumps CURRENT_VERSION and adds a migrate step.
const rich: Extensions = [
  StarterKit.configure({ ...notInStarterKit, heading: false }),
  RichHeading,
  SafeLink,
  Image,
  Embed,
  Table,
  TableRow,
  TableHeader,
  TableCell
]

// Ids let a block be dragged, linked to, and later edited together.
const blocks: Extensions = [
  ...rich,
  UniqueID.configure({ attributeName: BLOCK_ID, types: [...BLOCK_ID_TYPES] })
]

export const presets = { basic, rich, blocks } as const satisfies Record<
  Preset,
  Extensions
>

export type { Preset }
