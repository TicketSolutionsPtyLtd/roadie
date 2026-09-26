'use client'

import {
  Children,
  type ReactNode,
  isValidElement,
  useCallback,
  useMemo,
  useRef
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

// Base UI's own label for a value it has no label for.
function fallbackLabel(value: unknown) {
  if (value && typeof value === 'object') {
    if ('label' in value && value.label != null) return String(value.label)
    if ('value' in value) return String(value.value)
  }
  if (value == null) return ''
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
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

  // Items inside other components can't be read from here, so they register
  // their label on mount. A ref, so an inline object value can't loop renders.
  const mountedLabels = useRef(new Map<unknown, ItemLabel>())
  const registerLabel = useCallback((value: unknown, label: ItemLabel) => {
    mountedLabels.current.set(value, label)
  }, [])

  const renderedLabels = useMemo(
    () => collectLabels(children, new Map()),
    [children]
  )
  const labelOf = useCallback(
    (value: unknown) => {
      const label =
        renderedLabels.get(value) ?? mountedLabels.current.get(value)
      return label === undefined ? fallbackLabel(value) : String(label)
    },
    [renderedLabels]
  )

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
        items={items}
        itemToStringLabel={itemToStringLabel ?? (items ? undefined : labelOf)}
        {...props}
      >
        {children}
      </SelectPrimitive.Root>
    </SelectContext>
  )
}

SelectRoot.displayName = 'Select.Root'
