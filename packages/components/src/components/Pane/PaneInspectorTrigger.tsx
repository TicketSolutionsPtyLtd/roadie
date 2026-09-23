'use client'

import { use } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { IconButton, type IconButtonProps } from '../Button/IconButton'
import { Drawer } from '../Drawer'
import { PaneInspectorContext } from './PaneInspectorContext'

export type PaneInspectorTriggerProps = Omit<IconButtonProps, 'href' | 'render'>

/** Opens the inspector's content in a drawer; shows only while the inspector's column has yielded. */
export function PaneInspectorTrigger({
  className,
  emphasis = 'normal',
  ...props
}: PaneInspectorTriggerProps) {
  const handle = use(PaneInspectorContext)
  if (handle === null) return null
  return (
    <Drawer.Trigger
      handle={handle}
      render={
        <IconButton
          emphasis={emphasis}
          className={cn('pane-inspector-yielded:inline-flex hidden', className)}
          {...props}
        />
      }
    />
  )
}

PaneInspectorTrigger.displayName = 'Pane.InspectorTrigger'
