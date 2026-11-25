import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import roadieCss from '../../vitest.browser.css?inline'
import { Autocomplete } from '../components/Autocomplete'
import { Combobox } from '../components/Combobox'
import { Menu } from '../components/Menu'
import { useStylesheet } from '../components/Pane/testUtils'
import { Select } from '../components/Select'
import { apcaLc, over, shownFill } from './contrastTestUtils'

// Body text, decision 0010.
const BODY_TEXT_LC = 75

let removeRoadie = () => {}
beforeAll(() => {
  removeRoadie = useStylesheet(roadieCss)
})
afterAll(() => removeRoadie())
afterEach(() => {
  cleanup()
  document.documentElement.classList.remove('dark')
})

function contrast(element: Element) {
  const surface = shownFill(element)
  const text = over(surface, getComputedStyle(element).color)
  return Math.abs(apcaLc(text, surface))
}

type Region = { value: string; items: string[] }

const popups: [string, () => React.ReactNode, string][] = [
  [
    'a Select group label',
    () => (
      <Select defaultOpen defaultValue='brisbane'>
        <Select.Trigger aria-label='City'>
          <Select.Value />
        </Select.Trigger>
        <Select.Content>
          <Select.Group>
            <Select.GroupLabel>Queensland</Select.GroupLabel>
            <Select.Item value='brisbane'>
              <Select.ItemText>Brisbane</Select.ItemText>
            </Select.Item>
          </Select.Group>
        </Select.Content>
      </Select>
    ),
    'Queensland'
  ],
  [
    'a Combobox empty message',
    () => (
      <Combobox items={[]} defaultOpen>
        <Combobox.InputGroup>
          <Combobox.Input aria-label='Venue' />
        </Combobox.InputGroup>
        <Combobox.Portal>
          <Combobox.Positioner>
            <Combobox.Popup>
              <Combobox.Empty>No venues found</Combobox.Empty>
              <Combobox.List />
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox>
    ),
    'No venues found'
  ],
  [
    'an Autocomplete group label',
    () => (
      <Autocomplete
        defaultOpen
        items={[{ value: 'Victoria', items: ['Melbourne'] }]}
      >
        <Autocomplete.Input aria-label='City' />
        <Autocomplete.Portal>
          <Autocomplete.Positioner>
            <Autocomplete.Popup>
              <Autocomplete.List>
                {(group: Region) => (
                  <Autocomplete.Group key={group.value} items={group.items}>
                    <Autocomplete.GroupLabel>
                      {group.value}
                    </Autocomplete.GroupLabel>
                    <Autocomplete.Collection>
                      {(city: string) => (
                        <Autocomplete.Item key={city} value={city}>
                          {city}
                        </Autocomplete.Item>
                      )}
                    </Autocomplete.Collection>
                  </Autocomplete.Group>
                )}
              </Autocomplete.List>
            </Autocomplete.Popup>
          </Autocomplete.Positioner>
        </Autocomplete.Portal>
      </Autocomplete>
    ),
    'Victoria'
  ]
]

describe.each(popups)('%s in dark mode', (_, popup, text) => {
  it('reads as body text on the lifted popup', async () => {
    document.documentElement.classList.add('dark')
    render(popup())
    const label = await screen.findByText(text)
    expect(contrast(label)).toBeGreaterThanOrEqual(BODY_TEXT_LC)
  })
})

// What a change to popup elevation or motion moves: Menu is the reference.
const RECIPE = [
  'border-top-width',
  'border-top-left-radius',
  'box-shadow',
  'backdrop-filter',
  'transition-property',
  'transition-duration',
  'transition-timing-function'
] as const

async function recipe(slot: string) {
  await expect
    .poll(() => document.querySelector(`[data-slot=${slot}]`))
    .not.toBeNull()
  const style = getComputedStyle(document.querySelector(`[data-slot=${slot}]`)!)
  return Object.fromEntries(RECIPE.map((name) => [name, style[name as never]]))
}

describe.each(['light', 'dark'])('list popups in %s mode', (mode) => {
  const slots = ['select-popup', 'combobox-popup', 'autocomplete-popup']
  it.each(popups.map(([name, popup], i) => [name, popup, slots[i]!] as const))(
    '%s popup floats and moves like a Menu, without the blur',
    async (_, popup, slot) => {
      document.documentElement.classList.toggle('dark', mode === 'dark')
      render(
        <Menu defaultOpen>
          <Menu.Trigger>Actions</Menu.Trigger>
          <Menu.Content>
            <Menu.Item>Edit</Menu.Item>
          </Menu.Content>
        </Menu>
      )
      const menu = await recipe('menu-popup')
      cleanup()
      render(popup())
      // No blur: it repaints under every keystroke and frame of the exit,
      // which Combobox.perf and Select.perf miss 60fps on.
      expect(await recipe(slot)).toEqual({ ...menu, 'backdrop-filter': 'none' })
    }
  )
})
