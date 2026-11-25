import type { RecordField, RecordLayout } from '@oztix/roadie-core/records'

import { groupableFields } from './groups'

/** The most levels a view groups by, as core's view schema allows. */
const MAX_GROUP_LEVELS = 3

/** The layouts that group their records into sections by `groupBy`. */
export type GroupedLayoutType = 'table' | 'grid' | 'list'

/** The fields a view's layout groups by, outermost first, up to three, leaving out any that can't group and every level after one that can't. */
export function groupFields(
  fields: readonly RecordField[],
  layout: RecordLayout
): RecordField[] {
  const levels =
    layout.type === 'table' || layout.type === 'grid' || layout.type === 'list'
      ? (layout.groupBy ?? []).slice(0, MAX_GROUP_LEVELS)
      : []
  const groupable = groupableFields(fields)
  const found: RecordField[] = []
  for (const key of levels) {
    const field = groupable.find((one) => one.key === key)
    if (!field || found.includes(field)) break
    found.push(field)
  }
  return found
}

/** The `type` layout grouped by `levels`, outermost first, or not at all when there are none, keeping its other settings. */
export function groupLevelsLayout(
  type: GroupedLayoutType,
  current: RecordLayout,
  levels: readonly string[]
): RecordLayout {
  const kept: Record<string, unknown> =
    current.type === type ? { ...current } : { type }
  delete kept.groupBy
  return {
    ...kept,
    ...(levels.length > 0 && { groupBy: [...levels] })
  } as RecordLayout
}
