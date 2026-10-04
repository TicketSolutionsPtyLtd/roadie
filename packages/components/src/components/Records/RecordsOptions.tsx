'use client'

import {
  Suspense,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState
} from 'react'

import { SlidersHorizontalIcon } from '@phosphor-icons/react'

import type { RecordLayout } from '@oztix/roadie-core/records'

import {
  PickerOverlay,
  PickerTrigger,
  usePickerSurface
} from '../../pickers/PickerShell'
import { IconButton } from '../Button'
import { Tooltip } from '../Tooltip'
import { RecordsLayoutSettings } from './RecordsLayoutSettings'
import { RecordsSortSettings } from './RecordsSortSettings'
import { activeLayout, useRecordsContext } from './context'
import { whenIdle } from './idle'
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

/**
 * A button that opens the view's options: the layout, the sort, and the shown
 * layout's own settings, such as the table's columns. A popover, or a bottom
 * drawer on a phone. Renders nothing when there is nothing to set.
 */
export function RecordsOptions({ label, className }: RecordsOptionsProps) {
  const { records, layouts } = useRecordsContext()
  const [open, setOpen] = useState(false)
  const surface = usePickerSurface(open)
  const anchorRef = useRef<HTMLButtonElement>(null)
  const labelId = useId()

  const layout = activeLayout(layouts, records.view)
  const Settings = layout?.Settings
  // Lazy layouts' settings load once the page is idle, or as the button is
  // reached, so the first open doesn't wait for them and the page's first
  // load doesn't carry them. Every layout's, so a switch shows its settings
  // at once. Once per mount: a layout built in render makes a new `preload`
  // each time.
  const preload = useRef(() => {})
  useEffect(() => {
    preload.current = () => {
      for (const each of layouts) each.Settings?.preload?.()
    }
  })
  useEffect(() => whenIdle(() => preload.current()), [])
  const preloadNow = () => preload.current()
  // Each layout's settings as last shown in this baseline's view, so
  // switching back keeps them; another saved view starts afresh.
  const shownLayouts = useRef({
    baseline: '',
    layouts: new Map<string, RecordLayout>()
  })
  const { layout: viewLayout } = records.view
  const baselineKey = records.baseline ? JSON.stringify(records.baseline) : ''
  useLayoutEffect(() => {
    const memory = shownLayouts.current
    if (memory.baseline !== baselineKey)
      shownLayouts.current = { baseline: baselineKey, layouts: new Map() }
    shownLayouts.current.layouts.set(viewLayout.type, viewLayout)
  }, [viewLayout, baselineKey])
  const switchLayout = (type: RecordLayout['type']) => {
    const { baseline } = records
    records.setLayout(
      shownLayouts.current.layouts.get(type) ??
        (baseline?.layout.type === type
          ? baseline.layout
          : ({ type } as RecordLayout))
    )
  }
  const switches = layouts.length > 1
  const sorts = sortableFields(records.fields).length > 0
  if (!sorts && !Settings && !switches) return null
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
        {switches && layout && (
          <RecordsLayoutSettings shown={layout} onChange={switchLayout} />
        )}
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
