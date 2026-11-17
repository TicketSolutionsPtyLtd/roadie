import { createRef } from 'react'

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'

import roadieCss from '../../../vitest.browser.css?inline'
import { useStylesheet } from '../Pane/testUtils'
import { MapEngineContext } from './MapEngineContext'
import blankStyle from './fixtures/blank-style.json?url'
import { Map, type MapActions } from './index'
import { maplibreEngine } from './maplibreEngine'

const engine = maplibreEngine({
  tiles: { light: blankStyle, attribution: [{ label: 'Fixture' }] }
})

// Three suburbs a few kilometres apart, and a town 35 km out.
const sales = [
  { position: { lat: -27.467, lng: 153.051 }, value: 40, label: 'New Farm' },
  { position: { lat: -27.457, lng: 153.047 }, value: 30, label: 'Teneriffe' },
  { position: { lat: -27.46, lng: 153.0 }, value: 50, label: 'Paddington' },
  { position: { lat: -27.614, lng: 152.76 }, value: 60, label: 'Ipswich' }
]

let removeStylesheet: () => void
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

async function renderSales(
  locked = false,
  highlight?: string,
  legend = false,
  data: Parameters<typeof Map.Clusters>[0]['data'] = sales
) {
  const actions = createRef<MapActions>()
  const views: number[] = []
  const sample = (isLocked: boolean) => (
    <div style={{ width: 480 }}>
      <MapEngineContext value={engine}>
        <Map
          defaultCenter={{ lat: -27.46, lng: 153.03 }}
          defaultZoom={9}
          actionsRef={actions}
          onViewChange={({ zoom }) => views.push(zoom)}
        >
          <Map.Clusters
            data={data}
            label='Ticket sales'
            locked={isLocked}
            highlight={highlight}
            legend={legend}
          />
        </Map>
      </MapEngineContext>
    </div>
  )
  const { rerender } = render(sample(locked))
  const frame = screen.getByRole('region', { name: 'Map' })
  await waitFor(() => expect(frame).toHaveAttribute('data-status', 'ready'), {
    timeout: 10_000
  })
  /** Eases to a zoom and waits until it's there. */
  const zoomTo = async (zoom: number) => {
    actions.current!.flyTo({ zoom })
    await waitFor(() => expect(views.at(-1)).toBeCloseTo(zoom, 1), {
      timeout: 10_000
    })
  }
  const setLocked = (isLocked: boolean) => rerender(sample(isLocked))
  return { frame, zoomTo, setLocked }
}

const bands = () => screen.queryAllByRole('button', { name: /^Ticket sales/ })

describe('Map.Clusters in the browser', () => {
  it(
    'centres each band on its group, inside the frame',
    { timeout: 15_000 },
    async () => {
      const { frame } = await renderSales()
      await waitFor(() => expect(bands()).toHaveLength(2))

      const box = frame.getBoundingClientRect()
      for (const band of bands()) {
        const anchor = band.parentElement!.getBoundingClientRect()
        const drawn = band.getBoundingClientRect()
        // The anchor is the group's place; the band sits centred on it.
        expect(drawn.left + drawn.width / 2).toBeCloseTo(anchor.left, 0)
        expect(drawn.top + drawn.height / 2).toBeCloseTo(anchor.top, 0)
        expect(anchor.left).toBeGreaterThan(box.left)
        expect(anchor.right).toBeLessThan(box.right)
      }
    }
  )

  it(
    'draws a larger band for a larger value, with text that can’t be selected',
    { timeout: 15_000 },
    async () => {
      await renderSales()
      await waitFor(() => expect(bands()).toHaveLength(2))
      const size = (name: string) =>
        screen.getByRole('button', { name }).getBoundingClientRect().width
      const larger = size('Ticket sales: 120, 67% of all')
      const smaller = size('Ticket sales: 60, 33% of all')

      expect(larger).toBeGreaterThan(smaller + 4)
      expect(smaller).toBeGreaterThanOrEqual(44)
      const [band] = bands()
      // A double-click to zoom never selects the band's text.
      const style = getComputedStyle(band!)
      expect(style.userSelect || style.webkitUserSelect).toBe('none')
    }
  )

  // The map's centre, and a degree of longitude for each pixel at zoom 9.5.
  const centre = { lat: -27.46, lng: 153.03 }
  const pixel = 360 / (512 * 2 ** 9.5)
  /** A place this many pixels right of and below the map's centre. */
  const placeAt = (x: number, y: number, value: number) => ({
    position: {
      lat: centre.lat - y * pixel * Math.cos((centre.lat * Math.PI) / 180),
      lng: centre.lng + x * pixel
    },
    value
  })
  const renderAround = async (
    clusters: Partial<Parameters<typeof Map.Clusters>[0]>
  ) => {
    render(
      <div style={{ width: 480 }}>
        <MapEngineContext value={engine}>
          <Map defaultCenter={centre} defaultZoom={9.5}>
            <Map.Toolbar />
            <Map.Clusters data={[]} label='Ticket sales' {...clusters} />
          </Map>
        </MapEngineContext>
      </div>
    )
    const frame = screen.getByRole('region', { name: 'Map' })
    await waitFor(() => expect(frame).toHaveAttribute('data-status', 'ready'), {
      timeout: 10_000
    })
  }
  const middleOf = (element: Element) => {
    const box = element.getBoundingClientRect()
    return { x: box.left + box.width / 2, y: box.top + box.height / 2 }
  }

  it(
    'keeps the map’s controls above the bands, however many are in view',
    { timeout: 15_000 },
    async () => {
      // The largest band sits under Zoom in, with fifteen more in view.
      const data = [placeAt(211, -106, 500)]
      for (const x of [-270, -190, -110, -30, 50])
        for (const y of [-40, 40, 120]) data.push(placeAt(x, y, 10))
      await renderAround({ data })
      await waitFor(() => expect(bands()).toHaveLength(16))

      const zoomIn = screen.getByRole('button', { name: 'Zoom in' })
      const { x, y } = middleOf(zoomIn)
      const largest = screen
        .getByRole('button', { name: /^Ticket sales: 500,/ })
        .getBoundingClientRect()
      expect(largest.left).toBeLessThan(x)
      expect(largest.right).toBeGreaterThan(x)
      expect(largest.top).toBeLessThan(y)
      expect(largest.bottom).toBeGreaterThan(y)
      expect(zoomIn.contains(document.elementFromPoint(x, y))).toBe(true)
    }
  )

  it(
    'draws a larger band over a smaller one it overlaps',
    { timeout: 15_000 },
    async () => {
      // Long values widen two bands 90px apart until they overlap.
      await renderAround({
        data: [placeAt(-45, 0, 2_000_000), placeAt(45, 0, 1_000_000)],
        formatValue: (value) => `${value.toLocaleString('en-AU')}.00 sold`
      })
      await waitFor(() => expect(bands()).toHaveLength(2))
      const [larger, smaller] = bands()
      const overlap = {
        x:
          (larger!.getBoundingClientRect().right +
            smaller!.getBoundingClientRect().left) /
          2,
        y: middleOf(larger!).y
      }

      expect(smaller!.getBoundingClientRect().left).toBeLessThan(
        larger!.getBoundingClientRect().right - 8
      )
      expect(
        larger!.contains(document.elementFromPoint(overlap.x, overlap.y))
      ).toBe(true)
    }
  )

  it(
    'shifts a band to the next heat colour on hover and keyboard focus',
    { timeout: 15_000 },
    async () => {
      await renderSales()
      await waitFor(() => expect(bands()).toHaveLength(2))
      const band = screen.getByRole('button', {
        name: 'Ticket sales: 60, 33% of all'
      })
      // Colours read at once, without the fill's transition.
      const instant = document.createElement('style')
      instant.textContent = '* { transition: none !important }'
      document.head.append(instant)
      const fill = () => getComputedStyle(band).backgroundColor
      const rest = fill()

      await userEvent.hover(band)
      const hovered = fill()
      expect(hovered).not.toBe(rest)

      await userEvent.unhover(band)
      expect(fill()).toBe(rest)

      band.focus()
      await userEvent.keyboard('{Shift>}{Tab}{/Shift}{Tab}')
      expect(document.activeElement).toBe(band)
      expect(fill()).toBe(hovered)
      instant.remove()
    }
  )

  it(
    'gives a highlighted band its hover colour',
    { timeout: 15_000 },
    async () => {
      await renderSales(false, 'Ipswich')
      await waitFor(() => expect(bands()).toHaveLength(2))
      const instant = document.createElement('style')
      instant.textContent = '* { transition: none !important }'
      document.head.append(instant)
      const lit = screen.getByRole('button', {
        name: 'Ticket sales: 60, 33% of all'
      })
      const fill = () => getComputedStyle(lit).backgroundColor
      const highlighted = fill()

      lit.removeAttribute('data-highlighted')
      const rest = fill()
      await userEvent.hover(lit)
      expect(highlighted).not.toBe(rest)
      expect(fill()).toBe(highlighted)
      instant.remove()
    }
  )

  it(
    'colours the legend in the bands’ colours, strongest for the largest',
    { timeout: 15_000 },
    async () => {
      await renderSales(false, undefined, true)
      await waitFor(() => expect(bands()).toHaveLength(2))
      // Colours read at once, without the fill's transition.
      const instant = document.createElement('style')
      instant.textContent = '* { transition: none !important }'
      document.head.append(instant)
      const swatches = [
        ...document.querySelectorAll<HTMLElement>(
          '[data-slot="map-cluster-legend-swatch"]'
        )
      ].map((swatch) => getComputedStyle(swatch).backgroundColor)
      const fill = (name: string) =>
        getComputedStyle(screen.getByRole('button', { name })).backgroundColor

      expect(new Set(swatches).size).toBe(5)
      expect(swatches.at(-1)).toBe(fill('Ticket sales: 120, 67% of all'))
      expect(swatches).toContain(fill('Ticket sales: 60, 33% of all'))
      instant.remove()
    }
  )

  it(
    'eases in until a group splits, and moves focus to its largest part',
    { timeout: 20_000 },
    async () => {
      await renderSales()
      await waitFor(() => expect(bands()).toHaveLength(2))

      await userEvent.click(
        screen.getByRole('button', { name: 'Ticket sales: 120, 67% of all' })
      )

      // Paddington, and New Farm with Teneriffe, are the parts.
      await waitFor(
        () =>
          expect(document.activeElement).toBe(
            screen.getByRole('button', { name: 'Ticket sales: 70, 39% of all' })
          ),
        { timeout: 10_000 }
      )
      expect(
        screen.getByRole('button', { name: 'Ticket sales: 50, 28% of all' })
      ).toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: 'Ticket sales: 120, 67% of all' })
      ).not.toBeInTheDocument()
    }
  )

  it(
    'keeps its groups while locked and zooming in',
    { timeout: 20_000 },
    async () => {
      const { zoomTo, setLocked } = await renderSales(true)
      await waitFor(() => expect(bands()).toHaveLength(2))

      // Unlocked, New Farm, Teneriffe and Paddington are apart at 12.
      await zoomTo(12)

      expect(
        screen.getByRole('button', { name: 'Ticket sales: 120, 67% of all' })
      ).toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: /^Ticket sales: (50|40|30),/ })
      ).not.toBeInTheDocument()
      // Ipswich is out of view, so it has no band.
      expect(bands()).toHaveLength(1)

      setLocked(false)
      await waitFor(() =>
        expect(
          screen.getByRole('button', { name: 'Ticket sales: 50, 28% of all' })
        ).toBeInTheDocument()
      )
    }
  )

  it(
    'drills from every sale down to one spot, fed a point for each sale',
    { timeout: 60_000 },
    async () => {
      // 20,000 points with no value or label: four at each of 5,000 spots
      // about 30 m apart, as an order of four tickets sends.
      const points = Array.from({ length: 20_000 }, (_, i) => {
        const spot = Math.floor(i / 4)
        return {
          position: {
            lat: -27.45 - Math.floor(spot / 100) * 0.0003,
            lng: 153.015 + (spot % 100) * 0.0003
          }
        }
      })
      await renderSales(false, undefined, false, points)
      let band = await screen.findByRole('button', {
        name: /^Ticket sales: 20\D?000, 100% of all$/
      })

      // Each click splits the group, and focus moves to its largest part.
      for (let clicks = 0; band.hasAttribute('aria-describedby'); clicks++) {
        expect(clicks).toBeLessThan(20)
        const group = band
        await userEvent.click(group)
        await waitFor(
          () => {
            expect(document.activeElement).not.toBe(group)
            expect(document.activeElement).toHaveAttribute(
              'data-slot',
              'map-cluster-band'
            )
          },
          { timeout: 10_000 }
        )
        band = document.activeElement as HTMLElement
      }

      // One spot is left: its four sales, and nothing to split.
      expect(band).toHaveAccessibleName('Ticket sales: 4, <1% of all')
      // A preview closes while the map moves, so wait for the ease to end.
      let last = ''
      let since = 0
      await waitFor(
        () => {
          const { x, y } = band.getBoundingClientRect()
          if (last !== `${x},${y}`) {
            last = `${x},${y}`
            since = performance.now()
          }
          expect(performance.now() - since).toBeGreaterThan(300)
        },
        { timeout: 5_000 }
      )
      await userEvent.click(band)
      expect(await screen.findByText('Ticket sales: 4')).toBeVisible()
    }
  )
})
