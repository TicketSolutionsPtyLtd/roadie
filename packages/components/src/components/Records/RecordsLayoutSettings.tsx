'use client'

import { useId } from 'react'

import type { RecordLayout } from '@oztix/roadie-core/records'

import { ToggleGroup } from '../ToggleGroup'
import { useRecordsContext } from './context'
import type { AnyRecordLayout } from './layouts'

/** The layout switcher in `Records.Options`, for records given more than one layout. */
export function RecordsLayoutSettings({
  shown,
  onChange
}: {
  shown: AnyRecordLayout
  onChange: (type: RecordLayout['type']) => void
}) {
  const { layouts } = useRecordsContext()
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className='grid gap-2'>
      <h3 id={headingId} className='text-display-ui-6 text-strong'>
        Layout
      </h3>
      <ToggleGroup
        aria-labelledby={headingId}
        size='sm'
        value={[shown.type]}
        onValueChange={(value) => {
          const [type] = value
          // Pressing the shown layout again would leave none.
          if (type !== undefined && type !== shown.type) onChange(type)
        }}
        className='justify-self-start'
      >
        {layouts.map((layout) => (
          <ToggleGroup.Item key={layout.type} value={layout.type}>
            {layout.icon}
            {layout.label}
          </ToggleGroup.Item>
        ))}
      </ToggleGroup>
    </section>
  )
}
RecordsLayoutSettings.displayName = 'RecordsLayoutSettings'
