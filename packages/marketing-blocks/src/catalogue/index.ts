import { splitDefinition } from '../Split/definition'
import { statsDefinition } from '../Stats/definition'

/** A named configuration of a block: what editors pick in the Studio instead of setting options. */
export type BlockPreset = {
  /** Kebab-case, as a block's `preset` prop takes it. */
  name: string
  title: string
  description: string
  /** One of the block's two variants at most. */
  variant: string
}

export type BlockDefinition = {
  /** Kebab-case, as the block's subpath and `data-block` name it. */
  name: string
  title: string
  description: string
  presets: readonly BlockPreset[]
}

export type CatalogueBlock = Omit<BlockDefinition, 'presets'> & {
  /** The subpath to import the block from. */
  import: string
  presets: readonly (BlockPreset & {
    /** The preset's wireframe, as a subpath of the package. */
    thumbnail: string
  })[]
}

const PACKAGE = '@oztix/roadie-marketing-blocks'

export function thumbnailFile(block: string, preset: string): string {
  return `${block}-${preset}.svg`
}

function entry(definition: BlockDefinition): CatalogueBlock {
  return {
    ...definition,
    import: `${PACKAGE}/${definition.name}`,
    presets: definition.presets.map((preset) => ({
      ...preset,
      thumbnail: `${PACKAGE}/thumbnails/${thumbnailFile(definition.name, preset.name)}`
    }))
  }
}

const DEFINITIONS: readonly BlockDefinition[] = [
  splitDefinition,
  statsDefinition
]

/** Every block and its presets, for a CMS's block picker. Has no React, so it runs on a server or in a Studio config. */
export const catalogue: readonly CatalogueBlock[] = DEFINITIONS.map(entry)
