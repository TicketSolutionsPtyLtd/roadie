import {
  type Extensions,
  combineTransactionSteps,
  findChildrenInRange,
  getChangedRanges
} from '@tiptap/core'
import { UniqueID } from '@tiptap/extension-unique-id'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { StarterKit } from '@tiptap/starter-kit'

import { SafeLink, basic, starterKitOptions } from './basicPreset'
import { email } from './emailPreset'
import { Embed } from './embedNode'
import { RichHeading } from './headings'
import { Image } from './image'
import { BLOCK_ID, BLOCK_ID_TYPES, type Preset } from './presetShapes'
import { Table, TableCell, TableHeader, TableRow } from './table'

// Each name and attribute these extensions produce is saved in `EditorValue`,
// so changing one bumps CURRENT_VERSION and adds a migrate step.
const rich: Extensions = [
  StarterKit.configure({ ...starterKitOptions, heading: false }),
  RichHeading,
  SafeLink,
  Image,
  Embed,
  Table,
  TableRow,
  TableHeader,
  TableCell
]

// UniqueID strips the ids from every dropped slice, as ProseMirror lets any
// drag copy or move. This keeps them, then gives a dropped block a new id only
// when its old one is still in the doc, so a moved block keeps its id, and a
// copy, or text dragged out of a block that stays, gets one of its own.
const BlockIds = UniqueID.extend({
  addProseMirrorPlugins() {
    const { attributeName, generateID } = this.options
    return [
      ...(this.parent?.() ?? []),
      new Plugin({
        key: new PluginKey('blockIdsOnDrop'),
        props: {
          transformPasted: (slice, view) => view.dragging?.slice ?? slice
        },
        appendTransaction: (transactions, oldState, newState) => {
          if (!transactions.some((tr) => tr.getMeta('uiEvent') === 'drop')) {
            return
          }
          const uses = new Map<unknown, number>()
          newState.doc.descendants(({ attrs }) => {
            const id = attrs[attributeName]
            if (id != null) uses.set(id, (uses.get(id) ?? 0) + 1)
          })
          const { tr } = newState
          const changes = combineTransactionSteps(oldState.doc, [
            ...transactions
          ])
          const unmapped = changes.mapping.invert()
          for (const { newRange } of getChangedRanges(changes)) {
            for (const { node, pos } of findChildrenInRange(
              newState.doc,
              newRange,
              ({ attrs }) => (uses.get(attrs[attributeName]) ?? 0) > 1
            )) {
              if (!unmapped.mapResult(pos).deleted) continue
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                [attributeName]: generateID({ node, pos })
              })
            }
          }
          return tr.steps.length ? tr : null
        }
      })
    ]
  }
})

// Ids let a block be dragged, linked to, and later edited together.
const blocks: Extensions = [
  ...rich,
  BlockIds.configure({ attributeName: BLOCK_ID, types: [...BLOCK_ID_TYPES] })
]

export const presets = { basic, rich, blocks, email } as const satisfies Record<
  Preset,
  Extensions
>

export type { Preset }
