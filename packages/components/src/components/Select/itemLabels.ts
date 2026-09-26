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
