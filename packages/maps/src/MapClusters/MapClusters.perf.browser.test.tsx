import { createRef } from 'react'

import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'

import {
  expectFrameBudget,
  measureWhile,
  mount,
  setupFrameTests
} from '@oztix/roadie-frames'

import roadieCss from '../../vitest.browser.css?inline'
import { Map, type MapActions, type MapView } from '../Map'
import { MapEngineContext } from '../Map/MapEngineContext'
import blankStyle from '../Map/fixtures/blank-style.json?url'
import { maplibreEngine } from '../Map/maplibreEngine'
import { EventPage } from '../frameTestUtils'
import { MapClusters } from './MapClusters'

setupFrameTests({ css: roadieCss })

const engine = maplibreEngine({
  tiles: { light: blankStyle, attribution: [{ label: 'Fixture' }] }
})
const centre = { lat: -27.47, lng: 153.03 }

// A point for each sale: four at each of 5,000 spots about 100 m apart,
// 20,000 in all, across about 10 km.
const points = Array.from({ length: 20_000 }, (_, i) => {
  const spot = Math.floor(i / 4)
  return {
    label: `Spot ${spot + 1}`,
    position: {
      lat: centre.lat + 0.0225 - Math.floor(spot / 100) * 0.0009,
      lng: centre.lng - 0.045 + (spot % 100) * 0.0009
    }
  }
})

async function mountSales() {
  const actions = createRef<MapActions>()
  const view: { last?: MapView; bands: number } = { bands: 0 }
  const root = await mount(
    <EventPage>
      <MapEngineContext value={engine}>
        <Map
          defaultCenter={centre}
          defaultZoom={12}
          actionsRef={actions}
          onViewChange={(next) => {
            view.last = next
          }}
          className='w-160'
        >
          <Map.Toolbar />
          <MapClusters
            data={points}
            label='Ticket sales'
            highlight='Spot 1'
            legend
            onGroupsChange={(bands) => {
              view.bands = bands.length
            }}
          />
        </Map>
      </MapEngineContext>
    </EventPage>,
    { frames: 5 }
  )
  await expect
    .poll(
      () => root.querySelector('[data-slot=map]')?.getAttribute('data-status'),
      { timeout: 10_000 }
    )
    .toBe('ready')
  await expect.poll(() => view.bands).toBeGreaterThan(10)
  return { root, actions, view }
}

describe('MapClusters at 60fps on a slowed CPU', () => {
  it('pans over 20,000 points, with a highlight and a list of its bands', async () => {
    const { actions, view } = await mountSales()
    const east = { lat: centre.lat, lng: centre.lng + 0.03 }

    await expectFrameBudget(
      'MapClusters, panning over 20,000 points',
      await measureWhile(async () => {
        actions.current!.flyTo({ center: east })
        await expect
          .poll(() => view.last?.center.lng, { timeout: 10_000 })
          .toBeCloseTo(east.lng, 3)
      })
    )
  })

  it('zooms in to split the largest of 20,000 points’ bands', async () => {
    const { root } = await mountSales()
    const largest = [
      ...root.querySelectorAll<HTMLElement>('[data-slot=map-cluster-band]')
    ].find((band) => band.dataset.level === '4')!

    await expectFrameBudget(
      'MapClusters, splitting a band of 20,000 points',
      await measureWhile(async () => {
        await userEvent.click(largest)
        await expect
          .poll(() => largest.isConnected, { timeout: 10_000 })
          .toBe(false)
      })
    )
  })
})
