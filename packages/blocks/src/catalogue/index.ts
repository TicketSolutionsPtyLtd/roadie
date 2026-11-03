import { alternatingRowsDefinition } from '../AlternatingRows/definition'
import { callToActionDefinition } from '../CallToAction/definition'
import { cardsDefinition } from '../Cards/definition'
import { faqDefinition } from '../FAQ/definition'
import { galleryDefinition } from '../Gallery/definition'
import { heroDefinition } from '../Hero/definition'
import { mosaicDefinition } from '../Mosaic/definition'
import { richTextDefinition } from '../RichText/definition'
import { sideBySideDefinition } from '../SideBySide/definition'
import { statsDefinition } from '../Stats/definition'
import { testimonialDefinition } from '../Testimonial/definition'
import { ACTION_FIELDS, IMAGE_FIELDS } from '../_shared/shapes'
import type {
  BlockAlign,
  BlockRatio,
  ItemEmphasis,
  SurfaceEmphasis
} from '../_shared/surface'

/** Where a block goes on a page, and the picker group it sits in. */
export type BlockGroup = 'open' | 'explain' | 'prove' | 'close'

/** What a preset sets when its block's props leave them unset. */
export type BlockPresetDefaults = {
  align?: BlockAlign
  emphasis?: SurfaceEmphasis
  contained?: boolean
  itemEmphasis?: ItemEmphasis
  ratio?: BlockRatio | 'natural'
}

/** How many entries a collection should have. Outside it, a CMS warns, or with `strict`, refuses. */
export type BlockLimit = { min?: number; max?: number; strict?: boolean }

/**
 * A named configuration of a block: what editors pick instead of setting options.
 * `Field` and `ItemField` are the block's and its items' prop names, so a preset can
 * list only props its block takes.
 */
export type BlockPreset<
  Field extends string = string,
  ItemField extends string = string
> = {
  /** Kebab-case, as a block's `preset` prop takes it, and as a CMS stores it. */
  name: string
  title: string
  description: string
  /** The props this preset reads, so a CMS can hide the rest. */
  fields: readonly Field[]
  /** The props each item reads, for a block with a collection. */
  itemFields?: readonly ItemField[]
  defaults?: BlockPresetDefaults
  /** Item counts, keyed by the collection's prop. */
  limits?: Partial<Record<Field, BlockLimit>>
}

export type BlockDefinition<
  Field extends string = string,
  ItemField extends string = string
> = {
  /** Kebab-case, as the block's subpath, `data-block`, and a CMS's type name it. */
  name: string
  title: string
  /** When to use it, as one sentence an editor reads in a picker. */
  description: string
  group: BlockGroup
  presets: readonly BlockPreset<Field, ItemField>[]
  /** The fields inside the block's own object fields, such as a testimonial's `person`, by the field's name. Images and actions come from the catalogue. */
  shapes?: Readonly<Record<string, readonly string[]>>
}

// Every field by these names holds an image, or a list of them.
const IMAGE_NAMES = new Set(['image', 'images', 'logo', 'logos', 'poster'])

/** A preset's wireframe, a file in the package's `thumbnails` folder (`@oztix/roadie-blocks/thumbnails/<file>`). */
type Thumbnail = { thumbnail: string }

export type CatalogueBlock = Omit<BlockDefinition, 'presets' | 'shapes'> &
  Thumbnail & {
    /** The subpath to import the block from. */
    import: string
    /** The fields inside each field that holds an object, or a list of them, by the field's name, at any depth: its images, actions, and the block's own objects. A CMS builds its object types from these. */
    shapes: Readonly<Record<string, readonly string[]>>
    /** Its first preset's thumbnail stands for the block, where a picker shows one per block. */
    presets: readonly (BlockPreset & Thumbnail)[]
  }

const PACKAGE = '@oztix/roadie-blocks'

function thumbnailFile(block: string, preset: string): string {
  return `${block}-${preset}.svg`
}

function shapesOf(definition: BlockDefinition) {
  const own = definition.shapes ?? {}
  const names = new Set([
    ...definition.presets.flatMap((preset) => [
      ...preset.fields,
      ...(preset.itemFields ?? [])
    ]),
    ...Object.values(own).flat()
  ])
  const shapes: Record<string, readonly string[]> = {}
  for (const name of names) {
    if (IMAGE_NAMES.has(name)) shapes[name] = IMAGE_FIELDS
    if (name === 'actions') shapes[name] = ACTION_FIELDS
  }
  return { ...shapes, ...own }
}

function entry(definition: BlockDefinition): CatalogueBlock {
  const first = definition.presets[0]
  if (!first) throw new Error(`${definition.name} has no presets`)
  return {
    ...definition,
    import: `${PACKAGE}/${definition.name}`,
    shapes: shapesOf(definition),
    thumbnail: thumbnailFile(definition.name, first.name),
    presets: definition.presets.map((preset) => ({
      ...preset,
      thumbnail: thumbnailFile(definition.name, preset.name)
    }))
  }
}

const DEFINITIONS: readonly BlockDefinition[] = [
  heroDefinition,
  richTextDefinition,
  sideBySideDefinition,
  alternatingRowsDefinition,
  cardsDefinition,
  faqDefinition,
  statsDefinition,
  testimonialDefinition,
  galleryDefinition,
  mosaicDefinition,
  callToActionDefinition
]

/** Every block and its presets, for a CMS's block picker. Has no React, so it runs on a server or in a Studio config. */
export const catalogue: readonly CatalogueBlock[] = DEFINITIONS.map(entry)

/** The picker's groups, in page order. */
export const groups: readonly { name: BlockGroup; title: string }[] = [
  { name: 'open', title: 'Open' },
  { name: 'explain', title: 'Explain' },
  { name: 'prove', title: 'Prove' },
  { name: 'close', title: 'Close' }
]

export { ACTION_FIELDS, IMAGE_FIELDS } from '../_shared/shapes'
