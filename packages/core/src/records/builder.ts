import type { ValueFormat } from '../dataviz/format'
import type {
  RecordField,
  RecordMoment,
  RecordOption,
  StatusDefinition
} from './types'

type Common = {
  label: string
  filterable?: boolean
  sortable?: boolean
  searchable?: boolean
}

type KeyOf<Row> = keyof Row & string

export type TextFieldOptions = Common & { match?: RegExp; multiple?: boolean }
export type OptionFieldOptions = Common & {
  multiple?: boolean
  status?: Record<string, StatusDefinition>
  options?: RecordOption[]
}
export type NumberFieldOptions = Common & { format?: ValueFormat }
export type MoneyFieldOptions<Row> = NumberFieldOptions & {
  currency?: string
  currencyKey?: KeyOf<Row>
}
export type DateFieldOptions<Row> = Common & {
  end?: KeyOf<Row>
  moment?: RecordMoment
  timeZoneKey?: KeyOf<Row>
  localDateKey?: KeyOf<Row>
  endLocalDateKey?: KeyOf<Row>
}
export type BooleanFieldOptions = Common

type Built<Key extends string> = RecordField & { key: Key }

/**
 * Typed builders for an entity's `RecordField`s: each takes a key of `Row`,
 * and so does every option that names another row key.
 */
export function recordFields<Row extends object>() {
  return {
    text: <Key extends KeyOf<Row>>(
      key: Key,
      options: TextFieldOptions
    ): Built<Key> => ({ key, type: 'text', ...options }),
    option: <Key extends KeyOf<Row>>(
      key: Key,
      options: OptionFieldOptions
    ): Built<Key> => ({ key, type: 'option', ...options }),
    number: <Key extends KeyOf<Row>>(
      key: Key,
      options: NumberFieldOptions
    ): Built<Key> => ({ key, type: 'number', ...options }),
    money: <Key extends KeyOf<Row>>(
      key: Key,
      options: MoneyFieldOptions<Row>
    ): Built<Key> => ({ key, type: 'money', ...options }),
    date: <Key extends KeyOf<Row>>(
      key: Key,
      options: DateFieldOptions<Row>
    ): Built<Key> => ({ key, type: 'date', ...options }),
    boolean: <Key extends KeyOf<Row>>(
      key: Key,
      options: BooleanFieldOptions
    ): Built<Key> => ({ key, type: 'boolean', ...options })
  }
}
