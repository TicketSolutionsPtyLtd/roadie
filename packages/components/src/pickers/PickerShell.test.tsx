import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Field } from '../components/Field'
import { type PickerLabelOptions, usePickerLabels } from './PickerShell'

function Named(options: PickerLabelOptions) {
  const labels = usePickerLabels(options)
  return (
    <>
      {labels.labels}
      <button type='button' aria-labelledby={labels.triggerLabelledBy} />
      <div role='dialog' aria-labelledby={labels.popupLabelledBy} />
    </>
  )
}

describe('usePickerLabels', () => {
  it.each<[string, PickerLabelOptions, string, string]>([
    ['no label', { action: 'Choose date' }, 'Choose date', 'Choose date'],
    [
      'aria-label and value',
      {
        action: 'Choose date',
        'aria-label': 'Doors',
        valueText: 'Fri 27 Nov 2026'
      },
      'Choose date, Doors (Fri 27 Nov 2026)',
      'Choose date, Doors'
    ]
  ])('names the button and popup with %s', (_, options, button, popup) => {
    render(<Named {...options} />)
    expect(screen.getByRole('button')).toHaveAccessibleName(button)
    expect(screen.getByRole('dialog')).toHaveAccessibleName(popup)
  })

  it('prefers aria-labelledby, then the Field label', () => {
    render(
      <>
        <span id='own'>Curfew</span>
        <Field>
          <Field.Label>Doors</Field.Label>
          <Named action='Choose date' aria-labelledby='own' />
          <Named action='Choose date' />
        </Field>
      </>
    )
    const [first, second] = screen.getAllByRole('button')
    expect(first).toHaveAccessibleName('Choose date, Curfew')
    expect(second).toHaveAccessibleName('Choose date, Doors')
  })
})
