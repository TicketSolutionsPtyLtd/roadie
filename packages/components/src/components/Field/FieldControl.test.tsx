import type { ReactNode } from 'react'

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Field } from '.'
import { Autocomplete } from '../Autocomplete'
import { Combobox } from '../Combobox'
import { DateField } from '../DateField'
import { NumberField } from '../NumberField'
import { OTPField } from '../OTPField'
import { PhoneField } from '../PhoneField'
import { QueryField } from '../QueryField'
import { Select } from '../Select'

type Control = [
  name: string,
  role: 'textbox' | 'combobox' | 'group',
  render: (own: { 'aria-describedby'?: string }) => ReactNode
]

const CONTROLS: Control[] = [
  ['Field.Input', 'textbox', (own) => <Field.Input {...own} />],
  ['Field.Textarea', 'textbox', (own) => <Field.Textarea {...own} />],
  [
    'Select',
    'combobox',
    (own) => (
      <Select>
        <Select.Trigger {...own} />
      </Select>
    )
  ],
  [
    'Combobox',
    'combobox',
    (own) => (
      <Combobox>
        <Combobox.Input {...own} />
      </Combobox>
    )
  ],
  [
    'Autocomplete',
    'combobox',
    (own) => (
      <Autocomplete>
        <Autocomplete.Input {...own} />
      </Autocomplete>
    )
  ],
  [
    'NumberField',
    'textbox',
    (own) => (
      <NumberField>
        <NumberField.Input {...own} />
      </NumberField>
    )
  ],
  ['OTPField', 'group', (own) => <OTPField length={4} {...own} />],
  ['PhoneField', 'textbox', (own) => <PhoneField {...own} />],
  ['DateField', 'combobox', (own) => <DateField {...own} />],
  ['QueryField', 'combobox', () => <QueryField suggest={() => []} />]
]

const HELP = 'We only use it for this order'
const ERROR = 'Enter how we can reach you'
const HINT = 'Shown on your ticket'

type Case = { invalid?: boolean; helper?: boolean; describedBy?: string }

const FIELD_CASES: [string, Case, string][] = [
  ['the helper text', { helper: true }, HELP],
  ['the error text while invalid', { invalid: true }, ERROR],
  [
    'the helper and error text',
    { invalid: true, helper: true },
    `${HELP} ${ERROR}`
  ]
]

const OWN_CASES: [string, Case, string][] = [
  ['the id the app passes', { describedBy: 'app-hint' }, HINT],
  [
    'the helper and error text, then the id the app passes',
    { invalid: true, helper: true, describedBy: 'app-hint' },
    `${HELP} ${ERROR} ${HINT}`
  ]
]

function renderInField(
  [, role, renderControl]: Control,
  { invalid, helper, describedBy }: Case
) {
  render(
    <>
      <p id='app-hint'>{HINT}</p>
      <Field invalid={invalid}>
        <Field.Label>Contact</Field.Label>
        {/* Left out rather than `undefined` when the app passes none. */}
        {renderControl(describedBy ? { 'aria-describedby': describedBy } : {})}
        {helper && <Field.HelperText>{HELP}</Field.HelperText>}
        <Field.ErrorText>{ERROR}</Field.ErrorText>
      </Field>
    </>
  )
  return screen.getByRole(role)
}

describe.each(CONTROLS)('%s in a Field', (...control) => {
  // QueryField takes no aria-describedby of its own.
  const cases =
    control[0] === 'QueryField' ? FIELD_CASES : [...FIELD_CASES, ...OWN_CASES]
  it.each(cases)('is described by %s', (_, props, description) => {
    expect(renderInField(control, props)).toHaveAccessibleDescription(
      description
    )
  })
  it.skipIf(control[0] === 'QueryField')(
    'keeps the id the app passes outside a Field',
    () => {
      const [, role, renderControl] = control
      render(
        <>
          <p id='app-hint'>{HINT}</p>
          {renderControl({ 'aria-describedby': 'app-hint' })}
        </>
      )
      expect(screen.getByRole(role)).toHaveAccessibleDescription(HINT)
    }
  )
})

it('leaves the error text out for a control set valid in an invalid Field', () => {
  render(
    <Field invalid>
      <NumberField invalid={false} aria-label='Tickets' />
      <Field.HelperText>{HELP}</Field.HelperText>
      <Field.ErrorText>{ERROR}</Field.ErrorText>
    </Field>
  )
  expect(screen.getByRole('textbox')).toHaveAccessibleDescription(HELP)
})
