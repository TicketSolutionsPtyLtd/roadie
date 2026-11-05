import type { Extensions } from '@tiptap/core'
import { StarterKit } from '@tiptap/starter-kit'

import { SafeLink, basic, notInStarterKit } from './basicPreset'
import { email } from './emailPreset'
import { Embed } from './embedNode'
import { RichHeading } from './headings'
import { Image } from './image'
import type { Preset } from './presetShapes'
import { Table, TableCell, TableHeader, TableRow } from './table'

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

export const presets = { basic, rich, email } as const satisfies Record<
  Preset,
  Extensions
>

export type { Preset }
