import { act, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Field } from '../components/Field'
import {
  type PickerLabelOptions,
  usePickerLabels,
  usePickerSurface
} from './PickerShell'
import { onPhone } from './testUtils'

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
      'Choose date, Fri 27 Nov 2026, Doors',
      'Choose date, Doors'
    ],
    [
      'a value and no label',
      { action: 'Choose date', valueText: 'Fri 27 Nov 2026' },
      'Choose date, Fri 27 Nov 2026',
      'Choose date'
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

function Surface({ open }: { open: boolean }) {
  return <output>{usePickerSurface(open)}</output>
}

describe('usePickerSurface', () => {
  it('is a popover from the phone breakpoint up', () => {
    render(<Surface open={false} />)
    expect(screen.getByRole('status')).toHaveTextContent('popover')
  })

  it('is a drawer below it', () => {
    onPhone()
    render(<Surface open={false} />)
    expect(screen.getByRole('status')).toHaveTextContent('drawer')
  })

  it('follows the screen while closed and holds still while open', () => {
    const screenSize = onPhone(false)
    const { rerender } = render(<Surface open={false} />)
    act(() => screenSize.set(true))
    expect(screen.getByRole('status')).toHaveTextContent('drawer')
    rerender(<Surface open />)
    act(() => screenSize.set(false))
    expect(screen.getByRole('status')).toHaveTextContent('drawer')
    rerender(<Surface open={false} />)
    expect(screen.getByRole('status')).toHaveTextContent('popover')
  })
})
