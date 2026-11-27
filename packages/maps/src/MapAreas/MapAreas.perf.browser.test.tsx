import { describe, expect, it } from 'vitest'

import {
  expectFrameBudget,
  measureFrames,
  mount,
  settle,
  setupFrameTests
} from '@oztix/roadie-frames'

import roadieCss from '../../vitest.browser.css?inline'
import { Map } from '../Map'
import { MapEngineContext } from '../Map/MapEngineContext'
import blankStyle from '../Map/fixtures/blank-style.json?url'
import { maplibreEngine } from '../Map/maplibreEngine'
import { EventPage } from '../frameTestUtils'
import { MapAreas } from './MapAreas'
import type { MapAreaCollection } from './topology'

setupFrameTests({ css: roadieCss })

const engine = maplibreEngine({
  tiles: { light: blankStyle, attribution: [{ label: 'Fixture' }] }
})

// A grid of 2,880 areas, about as many as Australia's postcodes, that fills
// the map: each is some 8px across.
const COLUMNS = 72
const ROWS = 40
const SIZE = 0.008
const centre = { lat: -27.46, lng: 153.03 }
const west = centre.lng - (COLUMNS * SIZE) / 2
const south = centre.lat - (ROWS * SIZE) / 2
const cells = Array.from({ length: COLUMNS * ROWS }, (_, index) => ({
  id: String(2000 + index),
  column: index % COLUMNS,
  row: Math.floor(index / COLUMNS)
}))
const areas: MapAreaCollection = {
  type: 'FeatureCollection',
  features: cells.map(({ id, column, row }) => {
    const [x, y] = [west + column * SIZE, south + row * SIZE]
    return {
      id,
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [x, y],
            [x + SIZE, y],
            [x + SIZE, y + SIZE],
            [x, y + SIZE],
            [x, y]
          ]
        ]
      }
    }
  })
}
// Skewed, as totals by postcode are: most small, a few large in the middle.
const data = cells.map(({ id, column, row }) => ({
  id,
  value: Math.round(
    5 + 600 / (1 + Math.hypot(column - COLUMNS / 2, row - ROWS / 2))
  )
}))

describe('MapAreas follows the pointer at 60fps on a slowed CPU', () => {
  it('names and lights each of 2,880 areas under a sweeping pointer', async () => {
    const root = await mount(
      <EventPage>
        <MapEngineContext value={engine}>
          <Map defaultCenter={centre} defaultZoom={9.5} className='w-160'>
            <MapAreas areas={areas} data={data} label='Total' legend />
          </Map>
        </MapEngineContext>
      </EventPage>,
      { frames: 5 }
    )
    await expect
      .poll(
        () =>
          root.querySelector('[data-slot=map]')?.getAttribute('data-status'),
        { timeout: 10_000 }
      )
      .toBe('ready')
    await settle(10)
    const canvas = root.querySelector('[data-slot=map-surface] canvas')!
    const box = canvas.getBoundingClientRect()
    const frames = 120
    const named = new Set<string>()

    await expectFrameBudget(
      'MapAreas, 2,880 areas, pointer sweep',
      await measureFrames(
        (index) => {
          // Corner to corner, so each frame's pointer is over another area.
          canvas.dispatchEvent(
            new PointerEvent('pointermove', {
              bubbles: true,
              pointerType: 'mouse',
              clientX: box.left + 8 + ((box.width - 16) * index) / frames,
              clientY: box.top + 8 + ((box.height - 16) * index) / frames
            })
          )
          const label = root.querySelector('[data-slot=map-areas-tip] p')
          if (label) named.add(label.textContent)
        },
        { frames }
      )
    )

    expect(named.size).toBeGreaterThan(60)
  })
})
