import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { apcaLc, over, shownFill } from '@oztix/roadie-browser-testing/contrast'

import roadieCss from '../../vitest.browser.css?inline'
import { Autocomplete } from '../components/Autocomplete'
import { Combobox } from '../components/Combobox'
import { Menu } from '../components/Menu'
import { useStylesheet } from '../components/Pane/testUtils'
import { Select } from '../components/Select'

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
// The rim is compared on its own, below.
const RECIPE = [
  'border-top-left-radius',
  'backdrop-filter',
  'transition-property',
  'transition-duration',
  'transition-timing-function'
] as const

async function popupStyle(slot: string) {
  await expect
    .poll(() => document.querySelector(`[data-slot=${slot}]`))
    .not.toBeNull()
  return getComputedStyle(document.querySelector(`[data-slot=${slot}]`)!)
}

async function recipe(slot: string) {
  const style = await popupStyle(slot)
  return Object.fromEntries(RECIPE.map((name) => [name, style[name as never]]))
}

// A computed box-shadow's layers, split on the commas outside its colours.
function shadowLayers(boxShadow: string) {
  const layers: string[] = []
  let depth = 0
  let start = 0
  for (let i = 0; i < boxShadow.length; i++) {
    const char = boxShadow[i]
    if (char === '(') depth++
    else if (char === ')') depth--
    else if (char === ',' && depth === 0) {
      layers.push(boxShadow.slice(start, i).trim())
      start = i + 1
    }
  }
  layers.push(boxShadow.slice(start).trim())
  return layers.filter((layer) => layer !== 'none')
}

const isClear = (layer: string) =>
  /^rgba\(0, 0, 0, 0\) 0px 0px 0px 0px$/.test(layer)

async function edges(slot: string) {
  const style = await popupStyle(slot)
  const layers = shadowLayers(style.boxShadow)
  return {
    inset: layers.filter((layer) => layer.includes('inset')),
    outer: layers.filter(
      (layer) => !layer.includes('inset') && !isClear(layer)
    ),
    border: style.borderTopWidth,
    // The rim's highlight, not the text colour a border falls back to.
    top:
      style.borderTopColor === style.getPropertyValue('--rim-light-edge').trim()
  }
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

  it.each(popups.map(([name, popup], i) => [name, popup, slots[i]!] as const))(
    '%s popup draws the rim as its border, not an inset shadow',
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
      const menu = await edges('menu-popup')
      cleanup()
      render(popup())
      // A list popup scrolls. An inset shadow on a scroller moves its fill out
      // of the scrolling layer, and without a GPU every frame then blends the
      // rows over it again: Combobox.perf's virtualized typing drops frames.
      expect(await edges(slot)).toEqual({
        inset: [],
        outer: menu.outer,
        border: '1px',
        top: true
      })
    }
  )
})
