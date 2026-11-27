import { type ReactElement, useEffect, useRef } from 'react'

import { render, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Autocomplete } from './components/Autocomplete'
import { Button } from './components/Button'
import { CheckboxGroup } from './components/CheckboxGroup'
import { Collapsible } from './components/Collapsible'
import { Combobox } from './components/Combobox'
import { Dialog } from './components/Dialog'
import { Drawer } from './components/Drawer'
import { Menu } from './components/Menu'
import { NumberField } from './components/NumberField'
import { OTPField } from './components/OTPField'
import { Popover } from './components/Popover'
import { Progress } from './components/Progress'
import { RadioGroup } from './components/RadioGroup'
import { ScrollArea } from './components/ScrollArea'
import { Select } from './components/Select'
import { Slider } from './components/Slider'
import { Switch } from './components/Switch'
import { Tabs } from './components/Tabs'
import { Toast, useToastManager } from './components/Toast'
import { Toggle } from './components/Toggle'
import { ToggleGroup } from './components/ToggleGroup'
import { Toolbar } from './components/Toolbar'
import { Tooltip } from './components/Tooltip'

const PROBE = 'callback-probe'

type Callback = () => string
type Family = [name: string, ui: (c: Callback) => ReactElement, slots: string[]]

// Toast parts render only for a toast in the manager.
function Toasts({ c }: { c: Callback }) {
  const manager = useToastManager()
  const added = useRef(false)
  useEffect(() => {
    if (added.current) return
    added.current = true
    manager.add({ title: 'Saved', description: 'Doors at 7' })
  }, [manager])
  return manager.toasts.map((toast) => (
    <Toast.Root key={toast.id} toast={toast} className={c}>
      <Toast.Content className={c}>
        <Toast.Title className={c} />
        <Toast.Description className={c} />
      </Toast.Content>
    </Toast.Root>
  ))
}

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
  ],
  [
    'Dialog',
    (c) => (
      <Dialog.Root defaultOpen>
        <Dialog.Portal>
          <Dialog.Backdrop className={c} />
          <Dialog.Viewport className={c}>
            <Dialog.Popup className={c}>
              <Dialog.Title className={c}>Transfer tickets</Dialog.Title>
              <Dialog.Description className={c}>To a friend</Dialog.Description>
            </Dialog.Popup>
          </Dialog.Viewport>
        </Dialog.Portal>
      </Dialog.Root>
    ),
    [
      'dialog-backdrop',
      'dialog-viewport',
      'dialog-popup',
      'dialog-title',
      'dialog-description'
    ]
  ],
  [
    'Drawer',
    (c) => (
      <Drawer.Root defaultOpen>
        <Drawer.SwipeArea className={c} />
        <Drawer.Portal>
          <Drawer.Backdrop className={c} />
          <Drawer.Viewport className={c}>
            <Drawer.Popup className={c}>
              <Drawer.Title className={c}>Your order</Drawer.Title>
              <Drawer.Description className={c}>2 tickets</Drawer.Description>
            </Drawer.Popup>
          </Drawer.Viewport>
        </Drawer.Portal>
      </Drawer.Root>
    ),
    [
      'drawer-swipe-area',
      'drawer-backdrop',
      'drawer-viewport',
      'drawer-popup',
      'drawer-title',
      'drawer-description'
    ]
  ],
  [
    'Menu',
    (c) => (
      <Menu.Root defaultOpen>
        <Menu.Trigger>Sort</Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner className={c}>
            <Menu.Popup className={c}>
              <Menu.Group className={c}>
                <Menu.GroupLabel className={c}>View</Menu.GroupLabel>
                <Menu.CheckboxItem className={c}>Sold out</Menu.CheckboxItem>
              </Menu.Group>
              <Menu.Separator className={c} />
              <Menu.RadioGroup defaultValue='date' className={c}>
                <Menu.RadioItem value='date' className={c}>
                  Date
                </Menu.RadioItem>
              </Menu.RadioGroup>
              <Menu.SubmenuRoot>
                <Menu.SubmenuTrigger className={c}>More</Menu.SubmenuTrigger>
              </Menu.SubmenuRoot>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    ),
    [
      'menu-positioner',
      'menu-popup',
      'menu-group',
      'menu-group-label',
      'menu-checkbox-item',
      'menu-separator',
      'menu-radio-group',
      'menu-radio-item',
      'menu-submenu-trigger'
    ]
  ],
  [
    'Popover',
    (c) => (
      <Popover.Root defaultOpen>
        <Popover.Trigger>Details</Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner className={c}>
            <Popover.Popup className={c}>
              <Popover.Arrow className={c} />
              <Popover.Title className={c}>Doors</Popover.Title>
              <Popover.Description className={c}>At 7</Popover.Description>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    ),
    [
      'popover-positioner',
      'popover-popup',
      'popover-arrow',
      'popover-title',
      'popover-description'
    ]
  ],
  [
    'Tooltip',
    (c) => (
      <Tooltip.Root defaultOpen>
        <Tooltip.Trigger>Help</Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Positioner className={c}>
            <Tooltip.Popup className={c}>
              <Tooltip.Arrow className={c} />
              Doors at 7
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
    ),
    ['tooltip-positioner', 'tooltip-popup', 'tooltip-arrow']
  ],
  [
    'NumberField',
    (c) => (
      <NumberField.Root defaultValue={2} className={c}>
        <NumberField.ScrubArea className={c}>
          <NumberField.ScrubAreaCursor className={c} />
        </NumberField.ScrubArea>
        <NumberField.Group className={c}>
          <NumberField.Decrement className={c} />
          <NumberField.Input aria-label='Tickets' className={c} />
          <NumberField.Increment className={c} />
        </NumberField.Group>
      </NumberField.Root>
    ),
    [
      'number-field',
      'number-field-scrub-area',
      'number-field-group',
      'number-field-decrement',
      'number-field-input',
      'number-field-increment'
    ]
  ],
  [
    'OTPField',
    (c) => (
      <OTPField.Root length={2} aria-label='Code' className={c}>
        <OTPField.Input className={c} />
        <OTPField.Separator className={c} />
        <OTPField.Input className={c} />
      </OTPField.Root>
    ),
    ['otp-field', 'otp-field-separator', 'otp-field-input']
  ],
  [
    'ScrollArea',
    (c) => (
      <ScrollArea.Root className={c}>
        <ScrollArea.Viewport className={c}>
          <ScrollArea.Content className={c}>Lineup</ScrollArea.Content>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar keepMounted className={c}>
          <ScrollArea.Thumb className={c} />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
    ),
    [
      'scroll-area',
      'scroll-area-viewport',
      'scroll-area-content',
      'scroll-area-scrollbar',
      'scroll-area-thumb'
    ]
  ],
  [
    'Toast',
    (c) => (
      <Toast.Provider>
        <Toast.Viewport className={c}>
          <Toasts c={c} />
        </Toast.Viewport>
      </Toast.Provider>
    ),
    [
      'toast-viewport',
      'toast',
      'toast-content',
      'toast-title',
      'toast-description'
    ]
  ],
  [
    'Toolbar',
    (c) => (
      <Toolbar.Root aria-label='Format'>
        <Toolbar.Group className={c}>
          <Toolbar.ToggleGroup aria-label='Style' className={c}>
            <Toolbar.Toggle value='bold' aria-label='Bold' className={c} />
          </Toolbar.ToggleGroup>
        </Toolbar.Group>
      </Toolbar.Root>
    ),
    ['toolbar-group', 'toolbar-toggle-group', 'toolbar-toggle']
  ]
]

describe('a className callback on a Base UI wrapper', () => {
  it.each(families)(
    'adds its classes to every %s part',
    async (_, ui, slots) => {
      const className = vi.fn(() => PROBE)
      render(ui(className))
      const missing = () =>
        slots.filter(
          (slot) =>
            !document
              .querySelector(`[data-slot="${slot}"]`)
              ?.classList.contains(PROBE)
        )
      await waitFor(() => expect(missing()).toEqual([]))
      expect(className).toHaveBeenCalledWith(expect.any(Object))
    }
  )
})
