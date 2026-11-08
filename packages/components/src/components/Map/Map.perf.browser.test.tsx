import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'

import {
  expectFrameBudget,
  measureWhile,
  mount,
  setupFrameTests
} from '@oztix/roadie-frames'

import roadieCss from '../../../vitest.browser.css?inline'
import { EventPage, venues } from '../../utils/frameTestUtils'
import { MapEngineContext } from './MapEngineContext'
import blankStyle from './fixtures/blank-style.json?url'
import { Map, type Place } from './index'
import { maplibreEngine } from './maplibreEngine'

setupFrameTests({ css: roadieCss })

const engine = maplibreEngine({
  tiles: { light: blankStyle, attribution: [{ label: 'Fixture' }] }
})
const valley = { lat: -27.4575, lng: 153.0355 }

// A provider's answer: ten places near the map, best first.
const places: Place[] = venues(10).map((label, index) => ({
  label,
  address: 'Fortitude Valley QLD 4006',
  position: { lat: valley.lat + index * 0.001, lng: valley.lng }
}))
const suggest = async (text: string) => {
  const typed = text.toLowerCase()
  return places.filter((place) => place.label.toLowerCase().includes(typed))
}

describe('Map.Search at 60fps on a slowed CPU', () => {
  it('searches over a ready map as someone types', async () => {
    const root = await mount(
      <EventPage>
        <MapEngineContext value={engine}>
          <Map defaultCenter={valley} className='w-160'>
            <Map.Search suggest={suggest} />
            <Map.Toolbar expand />
            <Map.Picker defaultValue={valley} label='Entrance' />
          </Map>
        </MapEngineContext>
      </EventPage>,
      { frames: 5 }
    )
    await expect
      .poll(
        () =>
          root.querySelector('[data-slot=map]')?.getAttribute('data-status'),
        {
          timeout: 10_000
        }
      )
      .toBe('ready')
    const input = root.querySelector<HTMLInputElement>('[role="combobox"]')!
    await userEvent.click(input)
    await expectFrameBudget(
      'Map.Search, typing over a map',
      await measureWhile(() => userEvent.keyboard('kazoo hollow'))
    )
    expect(input.value).toBe('kazoo hollow')
    await expect
      .poll(() => document.querySelectorAll('[role="option"]').length)
      .toBeGreaterThan(0)
  })
})
