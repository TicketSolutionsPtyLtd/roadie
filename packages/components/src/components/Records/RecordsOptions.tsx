'use client'

import { Suspense, useEffect, useId, useRef, useState } from 'react'

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

// "Table" reads "table" mid-sentence; "CSV preview" and "Kanban Board" keep their capitals.
const inSentence = (label: string) =>
  /^[A-Z][^A-Z]*$/.test(label)
    ? label[0]!.toLowerCase() + label.slice(1)
    : label

// The panel itself, so no field looks active on open; Tab reaches the first control.
const focusPanel = (popup: HTMLElement) => popup

/** Runs once the page is idle, or soon where the browser can't say when. */
function whenIdle(run: () => void) {
  if (typeof requestIdleCallback === 'function') {
    const id = requestIdleCallback(() => run(), { timeout: 2000 })
    return () => cancelIdleCallback(id)
  }
  const id = setTimeout(run, 200)
  return () => clearTimeout(id)
}

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
  // A lazy layout's settings load once the page is idle, or as the button is
  // reached, so the first open doesn't wait for them and the page's first
  // load doesn't carry them. Once per mount: a layout built in render makes a
  // new `preload` each time.
  const preload = useRef(Settings?.preload)
  useEffect(() => {
    preload.current = Settings?.preload
  })
  useEffect(() => whenIdle(() => preload.current?.()), [])
  const preloadNow = () => preload.current?.()
  const sorts = sortableFields(records.fields).length > 0
  if (!sorts && !Settings) return null
  const name =
    label ?? (layout ? `Configure ${inSentence(layout.label)}` : 'Configure')

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
      className='w-88 overflow-y-auto'
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
                      onPointerEnter={preloadNow}
                      onFocus={preloadNow}
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
        {Settings && layout && (
          // A layout may load its settings on first open, as the table does.
          <Suspense fallback={null}>
            <Settings config={layout.config as never} />
          </Suspense>
        )}
      </div>
    </PickerOverlay>
  )
}
RecordsOptions.displayName = 'Records.Options'
