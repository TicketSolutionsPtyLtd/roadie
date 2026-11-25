import type { RecordField, RecordLayout } from '@oztix/roadie-core/records'

import type { RecordCardParts, RecordPart } from '../Records/types'
import type { GridLayoutConfig, GridPartOption } from './types'

const keyOf = (option: GridPartOption) =>
  typeof option === 'string' ? option : option.key

function toPart(
  option: GridPartOption,
  byKey: ReadonlyMap<string, RecordField>,
  kind?: 'image'
): RecordPart | undefined {
  const spec = typeof option === 'string' ? { key: option } : option
  const field = byKey.get(spec.key)
  if (!field) return undefined
  // A part's functions read the consumer's Row; the card hands it the same row.
  return { ...spec, field, ...(kind && { kind }) } as RecordPart
}

const ROLES = ['title', 'description', 'leading', 'trailing'] as const

/** Keys the card shows in a fixed place, which its fields setting never lists. */
function placedKeys(config: GridLayoutConfig) {
  return new Set(
    [config.image, ...ROLES.map((role) => config[role])].flatMap((option) =>
      option === undefined ? [] : [keyOf(option)]
    )
  )
}

/** Fields a card can list as details: every field the card doesn't show in a fixed place. */
export function detailCandidates(
  config: GridLayoutConfig,
  fields: readonly RecordField[]
) {
  const placed = placedKeys(config)
  return fields.filter((field) => !placed.has(field.key))
}

/** The detail keys the definition lists, of fields that exist. */
export function definedDetails(
  config: GridLayoutConfig,
  fields: readonly RecordField[]
) {
  const candidates = new Set(
    detailCandidates(config, fields).map((field) => field.key)
  )
  return unique((config.details ?? []).map(keyOf)).filter((key) =>
    candidates.has(key)
  )
}

const unique = (keys: readonly string[]) => [...new Set(keys)]

/** Which layout the details are for; a view of the other keeps its own fields. */
export type DetailsLayout = 'grid' | 'list'

const ownFields = (layout: RecordLayout, type: DetailsLayout) =>
  layout.type === type ? layout.fields : undefined

/** The detail keys a grid or list view shows, in order: its own `fields`, else the definition's. Keys it can't show are skipped. */
export function shownDetails(
  config: GridLayoutConfig,
  fields: readonly RecordField[],
  layout: RecordLayout,
  type: DetailsLayout = 'grid'
) {
  const own = ownFields(layout, type)
  if (!own?.length) return definedDetails(config, fields)
  const candidates = new Set(
    detailCandidates(config, fields).map((field) => field.key)
  )
  return unique(own).filter((key) => candidates.has(key))
}

/** The card's parts for a view: the definition's fixed places, and the details the view shows. */
export function gridParts(
  config: GridLayoutConfig,
  fields: readonly RecordField[],
  layout: RecordLayout,
  type: DetailsLayout = 'grid'
): RecordCardParts {
  const byKey = new Map(fields.map((field) => [field.key, field]))
  const part = (option: GridPartOption | undefined, kind?: 'image') =>
    option === undefined ? undefined : toPart(option, byKey, kind)
  const defined = new Map(
    (config.details ?? []).map((option) => [keyOf(option), option])
  )
  return {
    image: part(config.image, 'image'),
    title: part(config.title),
    description: part(config.description),
    leading: part(config.leading),
    trailing: part(config.trailing),
    details: shownDetails(config, fields, layout, type).flatMap(
      (key) => part(defined.get(key) ?? key) ?? []
    )
  }
}

/**
 * The grid or list layout after a change to its details. Each key for a field
 * this layout doesn't have, such as one only some people see, keeps its slot;
 * fields saved for the other layout aren't carried over. `fields` is left out
 * when the details are back to the definition's.
 */
export function gridDetailsLayout(
  config: GridLayoutConfig,
  fields: readonly RecordField[],
  shown: readonly string[],
  current: RecordLayout,
  type: DetailsLayout = 'grid'
): RecordLayout {
  const known = new Set(
    detailCandidates(config, fields).map((field) => field.key)
  )
  const queue = unique(shown).filter((key) => known.has(key))
  const written = unique(ownFields(current, type) ?? [])
  const slotted = written.flatMap((key) =>
    known.has(key) ? (queue.length > 0 ? queue.splice(0, 1) : []) : [key]
  )
  const merged = [...slotted, ...queue]
  const defined = definedDetails(config, fields)
  const backToDefinition =
    merged.length === defined.length &&
    merged.every((key, index) => key === defined[index])
  const layout: RecordLayout = backToDefinition
    ? { type }
    : { type, fields: merged }
  // Grouping is its own setting, so a details change keeps it.
  return (current.type === 'list' || current.type === 'grid') &&
    current.type === layout.type &&
    current.groupBy?.length
    ? { ...layout, groupBy: current.groupBy }
    : layout
}
