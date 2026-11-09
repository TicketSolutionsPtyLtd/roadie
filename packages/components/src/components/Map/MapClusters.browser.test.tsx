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

async function renderSales(locked = false, highlight?: string) {
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
            data={sales}
            label='Ticket sales'
            locked={isLocked}
            highlight={highlight}
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
})
