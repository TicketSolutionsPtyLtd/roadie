'use client'

import { use } from 'react'

import { IconTile, type IconTileProps } from '../IconTile'
import { EmptyStateContext } from './EmptyStateContext'
import type { EmptyStateSize } from './variants'

export type EmptyStateIconTileProps = IconTileProps

const tileSizeForEmptyState: Record<
  EmptyStateSize,
  NonNullable<IconTileProps['size']>
> = {
  sm: 'xl',
  md: '2xl',
  lg: '3xl'
}

export function EmptyStateIconTile({
  size,
  shape = 'circle',
  ...props
}: EmptyStateIconTileProps) {
  const emptyStateSize = use(EmptyStateContext)
  return (
    <IconTile
      data-slot='empty-state-icon-tile'
      size={size ?? tileSizeForEmptyState[emptyStateSize]}
      shape={shape}
      {...props}
    />
  )
}

EmptyStateIconTile.displayName = 'EmptyState.IconTile'
