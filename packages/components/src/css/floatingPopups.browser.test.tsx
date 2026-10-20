import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import roadieCss from '../../vitest.browser.css?inline'
import { Autocomplete } from '../components/Autocomplete'
import { Combobox } from '../components/Combobox'
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
