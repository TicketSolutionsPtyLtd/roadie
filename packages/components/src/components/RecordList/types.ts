import type { GridLayoutConfig } from '../RecordGrid/types'

/** Which field each part of a row shows. Details follow the description on its line. */
export type ListLayoutConfig<Row extends object = Record<string, unknown>> =
  Omit<GridLayoutConfig<Row>, 'image'> & {
    /** Groups rows by a single-valued field with options. A view can group by another field, but can't turn off the definition's grouping. */
    groupBy?: keyof Row & string
  }
