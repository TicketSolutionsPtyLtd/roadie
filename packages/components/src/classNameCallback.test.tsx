import type { ReactElement } from 'react'

import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Button } from './components/Button'
import { CheckboxGroup } from './components/CheckboxGroup'
import { Collapsible } from './components/Collapsible'
import { Progress } from './components/Progress'
import { RadioGroup } from './components/RadioGroup'
import { Select } from './components/Select'
import { Slider } from './components/Slider'
import { Switch } from './components/Switch'
import { Tabs } from './components/Tabs'
import { Toggle } from './components/Toggle'
import { ToggleGroup } from './components/ToggleGroup'

const PROBE = 'callback-probe'

type Callback = () => string
type Family = [name: string, ui: (c: Callback) => ReactElement, slots: string[]]

// Each family passes the callback to every part whose className lands on a Base UI part.
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
    'Collapsible',
    (c) => (
      <Collapsible.Root defaultOpen>
        <Collapsible.Trigger className={c}>Lineup</Collapsible.Trigger>
        <Collapsible.Panel className={c}>Doors at 7</Collapsible.Panel>
      </Collapsible.Root>
    ),
    ['collapsible-trigger', 'collapsible-panel']
  ],
  [
    'Select',
    (c) => (
      <Select.Root defaultOpen defaultValue='floor'>
        <Select.Label className={c}>Seating</Select.Label>
        <Select.Trigger className={c}>
          <Select.Value className={c} />
          <Select.Icon className={c} />
        </Select.Trigger>
        <Select.Portal>
          <Select.Positioner className={c}>
            <Select.Popup className={c}>
              <Select.ScrollUpArrow keepMounted className={c} />
              <Select.Group className={c}>
                <Select.GroupLabel className={c}>Areas</Select.GroupLabel>
                <Select.Item value='floor' className={c}>
                  <Select.ItemText>Floor</Select.ItemText>
                  <Select.ItemIndicator className={c} />
                </Select.Item>
              </Select.Group>
              <Select.ScrollDownArrow keepMounted className={c} />
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
    ),
    [
      'select-label',
      'select-trigger',
      'select-value',
      'select-icon',
      'select-positioner',
      'select-popup',
      'select-scroll-up-arrow',
      'select-group',
      'select-group-label',
      'select-item',
      'select-item-indicator',
      'select-scroll-down-arrow'
    ]
  ],
  [
    'Slider',
    (c) => (
      <Slider.Root defaultValue={40} className={c}>
        <Slider.Label className={c}>Volume</Slider.Label>
        <Slider.Value className={c} />
        <Slider.Control className={c}>
          <Slider.Track className={c}>
            <Slider.Indicator className={c} />
            <Slider.Thumb className={c} />
          </Slider.Track>
        </Slider.Control>
      </Slider.Root>
    ),
    [
      'slider',
      'slider-label',
      'slider-value',
      'slider-control',
      'slider-track',
      'slider-indicator',
      'slider-thumb'
    ]
  ],
  [
    'Tabs',
    (c) => (
      <Tabs.Root defaultValue='lineup' className={c}>
        <Tabs.List className={c}>
          <Tabs.Tab value='lineup' className={c}>
            Lineup
          </Tabs.Tab>
          <Tabs.Indicator className={c} />
        </Tabs.List>
        <Tabs.Panel value='lineup' className={c}>
          Doors at 7
        </Tabs.Panel>
      </Tabs.Root>
    ),
    ['tabs', 'tabs-list', 'tabs-tab', 'tabs-indicator', 'tabs-panel']
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
