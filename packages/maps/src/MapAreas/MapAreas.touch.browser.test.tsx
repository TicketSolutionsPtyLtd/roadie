import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { commands } from 'vitest/browser'

import roadieCss from '../../vitest.browser.css?inline'
import { Map } from '../Map'
import { MapEngineContext } from '../Map/MapEngineContext'
import blankStyle from '../Map/fixtures/blank-style.json?url'
import { maplibreEngine } from '../Map/maplibreEngine'
import { useStylesheet } from '../testUtils'
import { MapAreas } from './MapAreas'
import type { MapAreaCollection } from './topology'

const engine = maplibreEngine({
  tiles: { light: blankStyle, attribution: [{ label: 'Fixture' }] }
})

// One area round the map's middle, about 70px across.
const areas: MapAreaCollection = {
  type: 'FeatureCollection',
  features: [
    {
      id: '4000',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [152.98, -27.51],
            [153.08, -27.51],
            [153.08, -27.41],
            [152.98, -27.41],
            [152.98, -27.51]
          ]
        ]
      }
    }
  ]
}

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

describe('MapAreas on a touch screen', () => {
  it(
    'names a tapped area with its value and share, until a tap off it',
    { timeout: 20_000 },
    async () => {
      render(
        <div style={{ width: 480 }}>
          <MapEngineContext value={engine}>
            <Map defaultCenter={{ lat: -27.46, lng: 153.03 }} defaultZoom={9}>
              <MapAreas
                areas={areas}
                data={[
                  { id: '4000', value: 30, label: '4000 Brisbane' },
                  { id: '9999', value: 70 }
                ]}
                label='Total'
              />
            </Map>
          </MapEngineContext>
        </div>
      )
      const frame = screen.getByRole('region', { name: 'Map' })
      await waitFor(
        () => expect(frame).toHaveAttribute('data-status', 'ready'),
        { timeout: 10_000 }
      )
      const tip = () =>
        document.querySelector<HTMLElement>('[data-slot="map-areas-tip"]')
      const map = frame.getBoundingClientRect()
      const middle = {
        x: map.left + map.width / 2,
        y: map.top + map.height / 2
      }

      await commands.tap(middle.x, middle.y)
      await waitFor(() =>
        expect(tip()).toHaveTextContent('4000 BrisbaneTotal: 30, 30% of all')
      )

      // Off the area, towards the map's top left corner.
      await commands.tap(map.left + 30, map.top + 30)
      await waitFor(() => expect(tip()).not.toBeInTheDocument())
    }
  )
})
