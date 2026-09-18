'use client'

import { type ReactElement, type ReactNode, use } from 'react'

import { Tooltip } from '../Tooltip'
import { NavigatorExpansionContext } from './NavigatorContext'

export type NavigatorTileTooltipProps = {
  label: ReactNode
  disabled?: boolean
  /** Keep the tooltip while expanded, for a trigger that never shows its label. */
  iconOnly?: boolean
  render: (asTrigger: (tile: ReactElement) => ReactElement) => ReactNode
}

// aria-hidden: the tile already names itself in sr-only text.
export function NavigatorTileTooltip({
  label,
  disabled = false,
  iconOnly = false,
  render
}: NavigatorTileTooltipProps) {
  const { expanded } = use(NavigatorExpansionContext)
  return (
    <Tooltip disabled={(expanded && !iconOnly) || disabled}>
      {render((tile) => (
        <Tooltip.Trigger render={tile} />
      ))}
      <Tooltip.Content
        side='inline-end'
        aria-hidden
        className='pointer-coarse:hidden'
      >
        {label}
      </Tooltip.Content>
    </Tooltip>
  )
}
