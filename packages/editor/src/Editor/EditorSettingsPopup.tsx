'use client'

import type { ComponentProps, ReactNode } from 'react'

import { Drawer } from '@oztix/roadie-components/drawer'
import { Popover } from '@oztix/roadie-components/popover'

import { EditorSettingsHeader } from './EditorSettingsHeader'
import { EDITOR_POPUP, useOnPhone } from './toolbarMode'
import type { LiveEdit } from './useLiveEdit'

type PopoverContentProps = ComponentProps<typeof Popover.Content>

type EditorSettingsPopupProps = {
  /** Such as "Image settings". */
  title: string
  open: boolean
  live: LiveEdit
  anchor: NonNullable<PopoverContentProps['positionerProps']>['anchor']
  initialFocus: () => HTMLElement | null | undefined
  finalFocus: () => boolean
  children: ReactNode
}

/**
 * A selected image's, button's or embed's settings: a popover beside it, or
 * a half-height sheet on a phone, each led by its title, that changes apply
 * as they're made, and Done.
 */
export function EditorSettingsPopup({
  title,
  open,
  live,
  anchor,
  initialFocus,
  finalFocus,
  children
}: EditorSettingsPopupProps) {
  const phone = useOnPhone()
  if (phone) {
    return (
      // No blur, so the block shows its changes above the sheet.
      <Drawer
        open={open}
        onOpenChange={live.onOpenChange}
        side='bottom'
        emphasis='subtler'
      >
        <Drawer.Content
          {...{ [EDITOR_POPUP]: '' }}
          size='sm'
          onKeyDown={live.onKeyDown}
          initialFocus={initialFocus}
          finalFocus={finalFocus}
        >
          <EditorSettingsHeader title={title} sheet onDone={live.done} />
          <Drawer.Body className='pb-6'>{children}</Drawer.Body>
        </Drawer.Content>
      </Drawer>
    )
  }
  return (
    <Popover open={open} onOpenChange={live.onOpenChange}>
      <Popover.Content
        {...{ [EDITOR_POPUP]: '' }}
        side='bottom'
        align='start'
        sideOffset={8}
        className='max-h-(--available-height) w-80 max-w-(--available-width) overflow-y-auto'
        positionerProps={{ anchor }}
        onKeyDown={live.onKeyDown}
        initialFocus={initialFocus}
        finalFocus={finalFocus}
      >
        <EditorSettingsHeader title={title} sheet={false} onDone={live.done} />
        {children}
      </Popover.Content>
    </Popover>
  )
}
