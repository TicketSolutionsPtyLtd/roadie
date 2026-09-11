'use client'

import { type ReactElement, type ReactNode, use } from 'react'

import { Tooltip } from '../Tooltip'
import { NavigatorContext } from './NavigatorContext'

export type NavigatorTileTooltipProps = {
  label: ReactNode
  disabled?: boolean
  render: (asTrigger: (tile: ReactElement) => ReactElement) => ReactNode
}

// aria-hidden: the tile already names itself in sr-only text.
export function NavigatorTileTooltip({
  label,
  disabled = false,
  render
}: NavigatorTileTooltipProps) {
  const { expanded } = use(NavigatorContext)
  return (
    <Tooltip disabled={expanded || disabled}>
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
