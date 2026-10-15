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
  /** The chip whose values the step edits. It shows selected, in place of a pending chip. */
  chipId?: string
  /** Two or more show as a toggle above the values, which Tab steps through. */
  operators?: readonly QueryFieldOperator[]
  /** The chosen operator's `value`. */
  operator?: string
  /**
   * What to type, such as "Type a number.", shown and announced in place of
   * No suggestions while no value is listed.
   */
  hint?: string
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
  /** Enter takes it with no row chosen: an order number the text names exactly, or a value step's one answer, such as "City is empty". */
  exact?: boolean
  /**
   * Ticks the row, such as a value the chip being edited holds. Enter on typed
   * text passes over it while a chip is edited, so only an arrow or a click
   * unticks it.
   */
  selected?: boolean
  /** The typed words it doesn't read, left in the field once it is taken. */
  remainder?: string
  /** Opens an editor, such as "Custom dates", so only an arrow or a click takes it, never Enter on typed text. */
  opensEditor?: boolean
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
