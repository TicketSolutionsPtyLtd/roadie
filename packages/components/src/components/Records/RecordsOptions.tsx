'use client'

import { useId, useRef, useState } from 'react'

import { SlidersHorizontalIcon } from '@phosphor-icons/react'

import {
  PickerOverlay,
  PickerTrigger,
  usePickerSurface
} from '../../pickers/PickerShell'
import { IconButton } from '../Button'
import { Tooltip } from '../Tooltip'
import { RecordsSortSettings } from './RecordsSortSettings'
import { activeLayout, useRecordsContext } from './context'
import { sortableFields } from './sortOptions'

export type RecordsOptionsProps = {
  /** Names the button, its tooltip and the panel. @default "Configure" and the layout, such as "Configure table" */
  label?: string
  className?: string
}

// The panel itself, so no field looks active on open; Tab reaches the first control.
const focusPanel = (popup: HTMLElement) => popup

/**
 * A button that opens the view's options: the sort, and the shown layout's
 * own settings, such as the table's columns. A popover, or a bottom drawer on
 * a phone. Renders nothing when there is nothing to set.
 */
export function RecordsOptions({ label, className }: RecordsOptionsProps) {
  const { records, layouts } = useRecordsContext()
  const [open, setOpen] = useState(false)
  const surface = usePickerSurface(open)
  const anchorRef = useRef<HTMLButtonElement>(null)
  const labelId = useId()

  const layout = activeLayout(layouts, records.view)
  const Settings = layout?.Settings
  const sorts = sortableFields(records.fields).length > 0
  if (!sorts && !Settings) return null
  const name =
    label ?? (layout ? `Configure ${layout.label.toLowerCase()}` : 'Configure')

  return (
    <PickerOverlay
      open={open}
      onOpenChange={setOpen}
      surface={surface}
      anchor={anchorRef}
      aria-labelledby={labelId}
      labelSource={labelId}
      action={name}
      initialFocus={focusPanel}
      align='end'
      modal
      className='w-[22rem] overflow-y-auto'
      trigger={
        <>
          <span id={labelId} hidden>
            {name}
          </span>
          <Tooltip>
            <Tooltip.Trigger
              render={
                <PickerTrigger
                  ref={anchorRef}
                  render={
                    <IconButton
                      aria-label={name}
                      emphasis='normal'
                      className={className}
                    >
                      <SlidersHorizontalIcon
                        weight='bold'
                        className='size-4'
                        aria-hidden
                      />
                    </IconButton>
                  }
                />
              }
            />
            <Tooltip.Content>{name}</Tooltip.Content>
          </Tooltip>
        </>
      }
    >
      <div data-slot='records-options' className='grid gap-6'>
        {sorts && <RecordsSortSettings />}
        {Settings && layout && <Settings config={layout.config as never} />}
      </div>
    </PickerOverlay>
  )
}
RecordsOptions.displayName = 'Records.Options'
