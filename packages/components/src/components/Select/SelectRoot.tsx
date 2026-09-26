'use client'

import {
  Children,
  type ReactNode,
  isValidElement,
  useCallback,
  useMemo,
  useState
} from 'react'

import { Select as SelectPrimitive } from '@base-ui/react/select'

import { useFieldContext } from '../Field'
import { SelectContext } from './SelectContext'
import { SelectItem } from './SelectItem'
import { type ItemLabel, itemLabel } from './itemLabels'

export type SelectRootProps = SelectPrimitive.Root.Props<unknown> & {
  invalid?: boolean
  required?: boolean
}

// Reads labels from the JSX alone, so a default value shows its label on the
// server and before the popup has mounted its items.
function collectLabels(node: ReactNode, labels: Map<unknown, ItemLabel>) {
  Children.forEach(node, (child) => {
    if (!isValidElement<{ children?: ReactNode; value?: unknown }>(child))
      return
    if (child.type !== SelectItem) {
      collectLabels(child.props.children, labels)
      return
    }
    const label = itemLabel(child.props.children)
    if (label !== undefined) labels.set(child.props.value, label)
  })
  return labels
}

export function SelectRoot({
  invalid,
  required,
  disabled,
  items,
  itemToStringLabel,
  children,
  ...props
}: SelectRootProps) {
  const fieldContext = useFieldContext()
  const resolvedInvalid = invalid ?? fieldContext.invalid
  const resolvedRequired = required ?? fieldContext.required

  // Items rendered by other components only show up here once they mount.
  const [mounted, setMounted] = useState(() => new Map<unknown, ItemLabel>())
  const registerLabel = useCallback((value: unknown, label: ItemLabel) => {
    setMounted((labels) =>
      labels.get(value) === label ? labels : new Map(labels).set(value, label)
    )
  }, [])

  const labelledItems = useMemo(() => {
    if (items || itemToStringLabel) return items
    const labels = collectLabels(children, new Map(mounted))
    return labels.size
      ? Array.from(labels, ([value, label]) => ({ value, label }))
      : undefined
  }, [items, itemToStringLabel, children, mounted])

  return (
    <SelectContext
      value={{
        invalid: resolvedInvalid,
        required: resolvedRequired,
        registerLabel
      }}
    >
      <SelectPrimitive.Root
        disabled={disabled ?? fieldContext.disabled}
        items={labelledItems}
        itemToStringLabel={itemToStringLabel}
        {...props}
      >
        {children}
      </SelectPrimitive.Root>
    </SelectContext>
  )
}

SelectRoot.displayName = 'Select.Root'
