import type { ReactElement } from 'react'

import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Button } from './components/Button'
import { CheckboxGroup } from './components/CheckboxGroup'
import { Progress } from './components/Progress'
import { RadioGroup } from './components/RadioGroup'
import { Switch } from './components/Switch'
import { Toggle } from './components/Toggle'
import { ToggleGroup } from './components/ToggleGroup'

const PROBE = 'callback-probe'

type Callback = () => string
type Family = [name: string, ui: (c: Callback) => ReactElement, slots: string[]]

// Each family passes the callback to every Base UI part it wraps.
const families: Family[] = [
  ['Button', (c) => <Button className={c}>Save</Button>, ['button']],
  [
    'Button as a link',
    (c) => (
      <Button href='/tickets' className={c}>
        Tickets
      </Button>
    ),
    ['button']
  ],
  [
    'CheckboxGroup',
    (c) => (
      <CheckboxGroup aria-label='Genres' className={c}>
        <CheckboxGroup.Item value='rock' label='Rock' />
      </CheckboxGroup>
    ),
    ['checkbox-group']
  ],
  [
    'Progress',
    (c) => (
      <Progress.Root value={40} className={c}>
        <Progress.Label className={c}>Uploading</Progress.Label>
        <Progress.Value className={c} />
        <Progress.Track className={c}>
          <Progress.Indicator className={c} />
        </Progress.Track>
      </Progress.Root>
    ),
    [
      'progress',
      'progress-label',
      'progress-value',
      'progress-track',
      'progress-indicator'
    ]
  ],
  [
    'RadioGroup',
    (c) => (
      <RadioGroup aria-label='Seating' className={c}>
        <RadioGroup.Item value='floor' label='Floor' />
      </RadioGroup>
    ),
    ['radio-group']
  ],
  [
    'Switch',
    (c) => (
      <Switch.Root aria-label='Alerts' className={c}>
        <Switch.Thumb className={c} />
      </Switch.Root>
    ),
    ['switch', 'switch-thumb']
  ],
  [
    'Toggle',
    (c) => (
      <Toggle aria-label='Favourite' className={c}>
        Favourite
      </Toggle>
    ),
    ['toggle']
  ],
  [
    'ToggleGroup',
    (c) => (
      <ToggleGroup.Root aria-label='View' className={c}>
        <ToggleGroup.Item value='list' className={c}>
          List
        </ToggleGroup.Item>
      </ToggleGroup.Root>
    ),
    ['toggle-group', 'toggle-group-item']
  ]
]

describe('a className callback on a Base UI wrapper', () => {
  it.each(families)('adds its classes to every %s part', (_, ui, slots) => {
    const className = vi.fn(() => PROBE)
    render(ui(className))
    const missing = slots.filter(
      (slot) =>
        !document
          .querySelector(`[data-slot="${slot}"]`)
          ?.classList.contains(PROBE)
    )
    expect(missing).toEqual([])
    expect(className).toHaveBeenCalledWith(expect.any(Object))
  })
})
