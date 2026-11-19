'use client'

import { SlidersHorizontalIcon } from '@phosphor-icons/react'

import { PickerDrawerHeader } from '../../pickers/PickerShell'
import { Button } from '../Button'
import { Drawer } from '../Drawer'
import { useViewSettings } from './RecordsViewSettings'

export type RecordsViewProps = {
  /** Names the button and the drawer. @default 'View' */
  label?: string
  className?: string
}

/**
 * A View button that opens the view's settings in a bottom drawer at every
 * size: the layout, the sort, and the shown layout's own settings, such as
 * the table's columns. Renders nothing when there is nothing to set.
 */
export function RecordsView({ label = 'View', className }: RecordsViewProps) {
  const { preloadNow, settings } = useViewSettings()
  if (!settings) return null
  return (
    <Drawer>
      <Drawer.Trigger
        render={
          <Button
            emphasis='normal'
            className={className}
            onPointerEnter={preloadNow}
            onFocus={preloadNow}
          >
            <SlidersHorizontalIcon weight='bold' className='size-4' />
            {label}
          </Button>
        }
      />
      <Drawer.Content>
        <PickerDrawerHeader labelSource={undefined} action={label} />
        {/* With no footer, the body clears the home indicator. */}
        <Drawer.Body className='pb-[max(--spacing(6),env(safe-area-inset-bottom))]'>
          {settings}
        </Drawer.Body>
      </Drawer.Content>
    </Drawer>
  )
}
RecordsView.displayName = 'Records.View'
