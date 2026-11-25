'use client'

import { createContext } from 'react'

import { NAVIGATOR_EXPANDED_ATTRIBUTE } from '@oztix/roadie-core/navigator'

// A Group can't read the vertical navigation's folded rows from its own props.
export const NavigatorFoldedContext = createContext<ReadonlySet<string>>(
  new Set()
)
NavigatorFoldedContext.displayName = 'NavigatorFoldedContext'

/** Until measured, the height in rem each vertical item needs to stay. */
export const NavigatorFoldAtContext = createContext<ReadonlyMap<
  string,
  number
> | null>(null)
NavigatorFoldAtContext.displayName = 'NavigatorFoldAtContext'

/** `data-fold-below` for what holds `values`: gone under the least they need. */
export function foldBelow(
  at: ReadonlyMap<string, number> | null,
  values: string[]
) {
  const needs = values.flatMap((value) => at?.get(value) ?? [])
  return needs.length > 0 ? String(Math.min(...needs)) : undefined
}

// The head script's expanded rail folds nothing.
const expandedRoot = `:root[${NAVIGATOR_EXPANDED_ATTRIBUTE}]`

/** CSS that folds as `fitPrimaryCluster` would, by the cluster's height. */
export function foldStyle(thresholds: {
  slots: ReadonlyMap<string, number>
  all: number
}) {
  const below = [...new Set(thresholds.slots.values())].map(
    (height) =>
      `@container navigator-cluster (height < ${height}rem){:root:not([${NAVIGATOR_EXPANDED_ATTRIBUTE}]) [data-fold-below="${height}"]{display:none}}`
  )
  const { all } = thresholds
  return `${below.join('')}@container navigator-cluster (height >= ${all}rem){[data-unfold-at="${all}"]{display:none}}${expandedRoot} [data-unfold-at]{display:none}`
}
