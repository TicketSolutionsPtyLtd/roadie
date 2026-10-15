import type { ReactNode } from 'react'

export type QueryFieldIntent =
  'neutral' | 'brand' | 'accent' | 'danger' | 'success' | 'warning' | 'info'

export type QueryFieldChip = {
  id: string
  /** The whole condition as read aloud, such as "Venue is Iguana Teapot Hall". */
  label: string
  /** Set by the page, such as a scope: shown first, with no remove button. */
  locked?: boolean
  /** More about the condition, such as the dates "This weekend" stands for: in a tooltip, and read after the label. */
  description?: string
  intent?: QueryFieldIntent
}

/** One way to compare a pending field with its value, such as "is not". */
export type QueryFieldOperator = {
  value: string
  label: string
  /** Names a symbol for screen readers, such as "not equal to" for ≠. */
  'aria-label'?: string
}

export type QueryFieldPendingChip = {
  id: string
  /** Reads the chosen operator, such as "Venue is not". */
  label: string
  /** Two or more show as a toggle above the values, which Tab cycles. */
  operators?: readonly QueryFieldOperator[]
  /** The chosen operator's `value`. */
  operator?: string
}

export type QueryFieldSuggestion<Value = unknown> = {
  id: string
  label: string
  description?: ReactNode
  /** Pass a bold Phosphor icon; it is sized for you. */
  icon?: ReactNode
  /** `filter` adds a chip, `field` starts choosing values, `record` opens one. */
  kind: 'filter' | 'field' | 'record'
  value: Value
  /** The text names this one exactly, such as an order number, so Enter takes it. */
  exact?: boolean
  /** The typed words it doesn't read, left in the field once it is taken. */
  remainder?: string
}

export type QueryFieldSearchSuggestion = {
  id: 'search'
  label: string
  kind: 'search'
  /** The trimmed text. */
  value: string
}

export type QueryFieldAccepted<Value = unknown> =
  QueryFieldSuggestion<Value> | QueryFieldSearchSuggestion

export type QueryFieldSuggestionGroup<Value = unknown> = {
  id: string
  label: string
  items: readonly QueryFieldSuggestion<Value>[]
}

export type QueryFieldListGroup<Value = unknown> = {
  id: string
  label: string
  items: readonly QueryFieldAccepted<Value>[]
  builtIn?: boolean
}
