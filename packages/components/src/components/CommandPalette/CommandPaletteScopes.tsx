'use client'

import {
  Children,
  type ReactNode,
  isValidElement,
  useEffect,
  useMemo
} from 'react'

import { ToggleGroup, type ToggleGroupProps } from '../ToggleGroup'
import { useCommandPaletteScope } from './CommandPaletteContext'

// ToggleGroup values are non-empty strings, so All takes one no type would.
const ALL = '(all)'

export type CommandPaletteScopesProps = Omit<
  ToggleGroupProps,
  'value' | 'defaultValue' | 'onValueChange' | 'multiple' | 'children'
> & {
  /** The first tab's label, which shows every type. @default 'All' */
  allLabel?: ReactNode
  /** A `CommandPalette.Scope` for each type. */
  children: ReactNode
}

const scopeValue = (child: ReactNode) =>
  isValidElement<{ value?: unknown }>(child) &&
  typeof child.props.value === 'string'
    ? [child.props.value]
    : []

/** Tabs that narrow the commands to one type, with All first. */
export function CommandPaletteScopes({
  allLabel = 'All',
  children,
  className,
  ...props
}: CommandPaletteScopesProps) {
  const { scope, setScope, setScopes } = useCommandPaletteScope()
  const values = Children.toArray(children).flatMap(scopeValue)
  const key = values.join('\n')
  const order = useMemo(() => [null, ...key.split('\n').filter(Boolean)], [key])
  useEffect(() => {
    setScopes(order)
    return () => setScopes([null])
  }, [order, setScopes])
  return (
    <div
      data-slot='command-palette-scopes'
      className='border-b border-subtler px-3 py-2'
    >
      <ToggleGroup
        aria-label='Type'
        emphasis='subtler'
        size='sm'
        value={[scope ?? ALL]}
        onValueChange={([next]) =>
          setScope(!next || next === ALL ? null : next)
        }
        className={className}
        {...props}
      >
        <ToggleGroup.Item value={ALL}>{allLabel}</ToggleGroup.Item>
        {children}
      </ToggleGroup>
    </div>
  )
}

CommandPaletteScopes.displayName = 'CommandPalette.Scopes'
