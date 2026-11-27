import type { ReactElement } from 'react'

import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Autocomplete } from './components/Autocomplete'
import { Button } from './components/Button'
import { CheckboxGroup } from './components/CheckboxGroup'
import { Collapsible } from './components/Collapsible'
import { Combobox } from './components/Combobox'
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
  ],
  [
    'Autocomplete',
    (c) => (
      <Autocomplete.Root items={['Rock']} defaultOpen defaultValue='Rock'>
        <Autocomplete.InputGroup className={c}>
          <Autocomplete.Input aria-label='Genre' className={c} />
          <Autocomplete.Clear className={c} />
          <Autocomplete.Trigger className={c} />
        </Autocomplete.InputGroup>
        <Autocomplete.Portal>
          <Autocomplete.Positioner className={c}>
            <Autocomplete.Popup className={c}>
              <Autocomplete.Status className={c}>1 genre</Autocomplete.Status>
              <Autocomplete.Empty className={c}>No genres</Autocomplete.Empty>
              <Autocomplete.Group items={['Rock']} className={c}>
                <Autocomplete.GroupLabel className={c}>
                  Genres
                </Autocomplete.GroupLabel>
                <Autocomplete.Item value='Rock' className={c}>
                  Rock
                </Autocomplete.Item>
              </Autocomplete.Group>
            </Autocomplete.Popup>
          </Autocomplete.Positioner>
        </Autocomplete.Portal>
      </Autocomplete.Root>
    ),
    [
      'autocomplete-input-group',
      'autocomplete-input',
      'autocomplete-clear',
      'autocomplete-trigger',
      'autocomplete-positioner',
      'autocomplete-popup',
      'autocomplete-status',
      'autocomplete-empty',
      'autocomplete-group',
      'autocomplete-group-label',
      'autocomplete-item'
    ]
  ],
  [
    'Combobox',
    (c) => (
      <Combobox.Root
        multiple
        items={['Rock']}
        defaultValue={['Rock']}
        defaultOpen
      >
        <Combobox.Label className={c}>Genres</Combobox.Label>
        <Combobox.InputGroup className={c}>
          <Combobox.Chips className={c}>
            <Combobox.Chip className={c}>
              Rock
              <Combobox.ChipRemove aria-label='Remove Rock' className={c} />
            </Combobox.Chip>
            <Combobox.Input className={c} />
          </Combobox.Chips>
          <Combobox.Clear className={c} />
          <Combobox.Trigger className={c} />
        </Combobox.InputGroup>
        <Combobox.Portal>
          <Combobox.Positioner className={c}>
            <Combobox.Popup className={c}>
              <Combobox.Status className={c}>1 genre</Combobox.Status>
              <Combobox.Empty className={c}>No genres</Combobox.Empty>
              <Combobox.Group items={['Rock']} className={c}>
                <Combobox.GroupLabel className={c}>Genres</Combobox.GroupLabel>
                <Combobox.Item value='Rock' className={c}>
                  Rock
                  <Combobox.ItemIndicator className={c} />
                </Combobox.Item>
              </Combobox.Group>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    ),
    [
      'combobox-label',
      'combobox-input-group',
      'combobox-chips',
      'combobox-chip',
      'combobox-chip-remove',
      'combobox-input',
      'combobox-clear',
      'combobox-trigger',
      'combobox-positioner',
      'combobox-popup',
      'combobox-status',
      'combobox-empty',
      'combobox-group',
      'combobox-group-label',
      'combobox-item',
      'combobox-item-indicator'
    ]
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
