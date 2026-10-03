import type { ReactNode } from 'react'

export type QueryFieldIntent =
  'neutral' | 'brand' | 'accent' | 'danger' | 'success' | 'warning' | 'info'

export type QueryFieldChip = {
  id: string
  /** The whole condition as read aloud, such as "Venue is The Longacre". */
  label: string
  /** Set by the page, such as a scope: shown first, with no remove button. */
  locked?: boolean
  intent?: QueryFieldIntent
}

export type QueryFieldSuggestion<Value = unknown> = {
  id: string
  label: string
  description?: ReactNode
  /** `filter` adds a chip, `field` starts choosing values, `record` opens one. */
  kind: 'filter' | 'field' | 'record'
  value: Value
  /** The text names this one exactly, such as an order number, so Enter takes it. */
  exact?: boolean
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
