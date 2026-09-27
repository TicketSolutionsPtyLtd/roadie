import { Children, type ReactNode, isValidElement } from 'react'

import { SelectItemText } from './SelectItemText'

export type ItemLabel = string | number

export function itemLabel(children: ReactNode): ItemLabel | undefined {
  if (typeof children === 'string' || typeof children === 'number')
    return children
  let label: ItemLabel | undefined
  Children.forEach(children, (child) => {
    if (
      label === undefined &&
      isValidElement<{ children?: ReactNode }>(child) &&
      child.type === SelectItemText
    )
      label = itemLabel(child.props.children)
  })
  return label
}

type Items = Record<string, ReactNode> | ReadonlyArray<unknown>
type LabelledItem = { label?: ReactNode; value?: unknown }

function isGroup(item: unknown): item is { items: readonly unknown[] } {
  return (
    typeof item === 'object' &&
    item !== null &&
    Array.isArray((item as { items?: unknown }).items)
  )
}

export function labelFromItems(items: Items, value: unknown): ReactNode {
  if (value && typeof value === 'object') {
    const own = (value as LabelledItem).label
    if (own != null) return own
  }
  if (!Array.isArray(items)) {
    const record = items as Record<string, ReactNode>
    return Object.hasOwn(record, String(value))
      ? record[String(value)]
      : undefined
  }
  const flat = items.flatMap((item) => (isGroup(item) ? item.items : [item]))
  const key =
    value && typeof value === 'object' && 'value' in value
      ? (value as LabelledItem).value
      : value
  const match = flat.find((item) => (item as LabelledItem)?.value === key) as
    LabelledItem | undefined
  return match?.label ?? undefined
}
