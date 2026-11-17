import { type CSSProperties, useState } from 'react'

import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AccentScopeContext } from '../../providers/AccentScopeContext'
import { MapProvider } from './MapProvider'
import { Map } from './index'
import { fakeEngine, renderMap, venue } from './mapTestUtils'

const east = { lat: venue.lat, lng: venue.lng + 0.05 }

describe('Map.Toolbar', () => {
  const geolocation = navigator.geolocation
  afterEach(() => {
    Object.defineProperty(navigator, 'geolocation', {
      value: geolocation,
      configurable: true
    })
  })

  it('zooms in and out a step at a time', async () => {
    const fake = fakeEngine()
    await renderMap(fake.engine, <Map.Toolbar />)

    await userEvent.click(screen.getByRole('button', { name: 'Zoom in' }))
    expect(fake.instance.setView).toHaveBeenLastCalledWith(
      { zoom: 15 },
      { animate: true }
    )
    await userEvent.click(screen.getByRole('button', { name: 'Zoom out' }))
    expect(fake.instance.setView).toHaveBeenLastCalledWith(
      { zoom: 14 },
      { animate: true }
    )
  })

  it('shows my location only when asked', async () => {
    await renderMap(fakeEngine().engine, <Map.Toolbar />)
    expect(
      screen.queryByRole('button', { name: 'Show my location' })
    ).not.toBeInTheDocument()
  })

  it('joins the zoom buttons, and keeps my location and full screen apart', async () => {
    await renderMap(fakeEngine().engine, <Map.Toolbar locate expand />)
    const zoom = screen.getByRole('toolbar', { name: 'Zoom' })

    expect(
      within(zoom).getByRole('button', { name: 'Zoom in' })
    ).toBeInTheDocument()
    expect(
      within(zoom).getByRole('button', { name: 'Zoom out' })
    ).toBeInTheDocument()
    expect(zoom).not.toContainElement(
      screen.getByRole('button', { name: 'Show my location' })
    )
    expect(zoom).not.toContainElement(
      screen.getByRole('button', { name: 'Full screen' })
    )
  })

  // A browser's location service that tests feed positions to.
  function fakeGeolocation() {
    let found: PositionCallback | undefined
    let failed: PositionErrorCallback | undefined
    const clearWatch = vi.fn()
    const watchPosition = vi.fn(
      (onFound: PositionCallback, onFailed?: PositionErrorCallback | null) => {
        found = onFound
        failed = onFailed ?? undefined
        return 7
      }
    )
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { watchPosition, clearWatch }
    })
    return {
      watchPosition,
      clearWatch,
      move: (place: { lat: number; lng: number }) =>
        act(() =>
          found!({
            coords: { latitude: place.lat, longitude: place.lng }
          } as GeolocationPosition)
        ),
      // 1 is a refusal and 3 a fix that took too long, as the browser codes them.
      fail: (code = 1) =>
        act(() =>
          failed!({
            code,
            PERMISSION_DENIED: 1,
            TIMEOUT: 3
          } as GeolocationPositionError)
        )
    }
  }
  const myLocation = () =>
    screen
      .getByRole('img', { name: 'Your location' })
      .closest<HTMLElement>('[data-slot=map-user-location]')!

  it('centres on my location, marks it, and follows it', async () => {
    const fake = fakeEngine()
    const location = fakeGeolocation()
    await renderMap(fake.engine, <Map.Toolbar locate />)
    const button = screen.getByRole('button', { name: 'Show my location' })
    await userEvent.click(button)
    expect(button).toHaveAttribute('aria-pressed', 'true')

    location.move(east)
    expect(fake.instance.setView).toHaveBeenLastCalledWith(
      { center: east, zoom: 15 },
      { animate: true }
    )
    const first = myLocation().style.transform

    // Later fixes move the dot, not the map.
    const calls = vi.mocked(fake.instance.setView).mock.calls.length
    location.move({ lat: east.lat + 0.01, lng: east.lng })
    expect(myLocation().style.transform).not.toBe(first)
    expect(fake.instance.setView).toHaveBeenCalledTimes(calls)
  })

  it('keeps following through a slow fix, and stops when refused', async () => {
    const location = fakeGeolocation()
    await renderMap(fakeEngine().engine, <Map.Toolbar locate />)
    const button = screen.getByRole('button', { name: 'Show my location' })
    await userEvent.click(button)
    location.move(east)

    location.fail(3)
    expect(
      screen.getByRole('img', { name: 'Your location' })
    ).toBeInTheDocument()
    expect(button).toHaveAttribute('aria-pressed', 'true')

    location.fail(1)
    expect(
      screen.queryByRole('img', { name: 'Your location' })
    ).not.toBeInTheDocument()
    expect(location.clearWatch).toHaveBeenCalledWith(7)
  })

  it('stops following my location on a second press', async () => {
    const location = fakeGeolocation()
    await renderMap(fakeEngine().engine, <Map.Toolbar locate />)
    const button = screen.getByRole('button', { name: 'Show my location' })
    await userEvent.click(button)
    location.move(east)
    await userEvent.click(button)

    expect(location.clearWatch).toHaveBeenCalledWith(7)
    expect(button).toHaveAttribute('aria-pressed', 'false')
    expect(
      screen.queryByRole('img', { name: 'Your location' })
    ).not.toBeInTheDocument()
  })

  it('stops asking for my location when pressed again before it comes', async () => {
    const location = fakeGeolocation()
    await renderMap(fakeEngine().engine, <Map.Toolbar locate />)
    const button = screen.getByRole('button', { name: 'Show my location' })
    await userEvent.click(button)
    await userEvent.click(button)

    expect(location.clearWatch).toHaveBeenCalledWith(7)
    expect(location.watchPosition).toHaveBeenCalledTimes(1)
    expect(button).toHaveAttribute('aria-pressed', 'false')
  })

  it('stops watching my location when the map goes', async () => {
    const location = fakeGeolocation()
    const { unmount } = await renderMap(
      fakeEngine().engine,
      <Map.Toolbar locate />
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Show my location' })
    )
    unmount()

    expect(location.clearWatch).toHaveBeenCalledWith(7)
  })

  // 2 is no fix at all, as the browser codes it.
  it.each([
    ['refused', 1],
    ['never found', 2]
  ])('says so when my location is %s', async (_, code) => {
    const location = fakeGeolocation()
    await renderMap(fakeEngine().engine, <Map.Toolbar locate />)
    const button = screen.getByRole('button', { name: 'Show my location' })
    await userEvent.click(button)
    location.fail(code)

    expect(screen.getByRole('status')).toHaveTextContent(
      'Your location isn’t available'
    )
    expect(button).toHaveAttribute('aria-pressed', 'false')
    expect(location.clearWatch).toHaveBeenCalledWith(7)
  })

  it('says so when the browser has no location service', async () => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: undefined
    })
    await renderMap(fakeEngine().engine, <Map.Toolbar locate />)
    await userEvent.click(
      screen.getByRole('button', { name: 'Show my location' })
    )

    expect(screen.getByRole('status')).toHaveTextContent(
      'Your location isn’t available'
    )
  })
})

describe('MapProvider', () => {
  it('gives every map inside its engine', async () => {
    const fake = fakeEngine()
    await renderMap(fake.engine)
    expect(fake.engine.mount).toHaveBeenCalledTimes(1)
  })

  it('shows no credits for an engine that draws its own', async () => {
    await renderMap(fakeEngine([]).engine)
    await act(async () => {})
    expect(
      screen.queryByRole('button', { name: 'Map credits', hidden: true })
    ).not.toBeInTheDocument()
  })
})

describe('Map full screen', () => {
  const fullScreen = () => screen.getByRole('button', { name: 'Full screen' })
  const exitFullScreen = () =>
    screen.getByRole('button', { name: 'Exit full screen' })
  const surface = () => document.querySelector('[data-slot=map-surface]')!
  const layer = () => screen.queryByRole('dialog', { name: 'Map' })
  // The overflow Base UI's scroll lock sets, a tick after it's asked.
  const pageLocked = () => document.body.style.overflowY === 'hidden'

  it('offers no full screen button unless asked', async () => {
    await renderMap(fakeEngine().engine, <Map.Toolbar />)
    expect(
      screen.queryByRole('button', { name: 'Full screen' })
    ).not.toBeInTheDocument()
  })

  it('fills the window in a dialog and comes back', async () => {
    await renderMap(fakeEngine().engine, <Map.Toolbar expand />)
    await userEvent.click(fullScreen())

    const dialog = layer()!
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    // The page behind is hidden from screen readers while the map fills
    // the window.
    expect(
      screen.getByRole('region', { name: 'Map', hidden: true })
    ).not.toContainElement(dialog)
    expect(dialog).toContainElement(surface() as HTMLElement)
    expect(dialog).toHaveAttribute('data-expanded')
    expect(dialog.querySelector('[data-slot=map-viewport]')).toHaveAttribute(
      'data-expanded'
    )

    await userEvent.click(exitFullScreen())
    await waitFor(() => expect(layer()).not.toBeInTheDocument())
    expect(screen.getByRole('region', { name: 'Map' })).toContainElement(
      surface() as HTMLElement
    )
    expect(
      document.querySelector('[data-slot=map-viewport]')
    ).not.toHaveAttribute('data-expanded')
  })

  it('keeps one engine across every change', async () => {
    const fake = fakeEngine()
    await renderMap(fake.engine, <Map.Toolbar expand />)
    await userEvent.click(fullScreen())
    await userEvent.click(exitFullScreen())
    await userEvent.click(fullScreen())

    expect(fake.engine.mount).toHaveBeenCalledTimes(1)
    expect(fake.instance.destroy).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Zoom in' }))
    expect(fake.instance.setView).toHaveBeenLastCalledWith(
      { zoom: 15 },
      { animate: true }
    )
  })

  it('keeps focus on the button as the map moves', async () => {
    await renderMap(fakeEngine().engine, <Map.Toolbar expand />)
    await userEvent.click(fullScreen())
    expect(exitFullScreen()).toHaveFocus()

    await userEvent.click(exitFullScreen())
    expect(fullScreen()).toHaveFocus()
  })

  it('returns focus to an app’s own button', async () => {
    function LargerMap() {
      const [expanded, setExpanded] = useState(false)
      return (
        <MapProvider engine={fake.engine}>
          <button type='button' onClick={() => setExpanded(true)}>
            View larger map
          </button>
          <Map
            defaultCenter={venue}
            expanded={expanded}
            onExpandedChange={setExpanded}
          />
        </MapProvider>
      )
    }
    const fake = fakeEngine()
    render(<LargerMap />)
    await act(async () => {})
    const trigger = screen.getByRole('button', { name: 'View larger map' })
    await userEvent.click(trigger)
    await waitFor(() =>
      expect(layer()).toContainElement(document.activeElement as HTMLElement)
    )

    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(layer()).not.toBeInTheDocument())
    await waitFor(() => expect(trigger).toHaveFocus())
  })

  it('exits on Escape', async () => {
    await renderMap(fakeEngine().engine, <Map.Toolbar expand />)
    await userEvent.click(fullScreen())
    await userEvent.keyboard('{Escape}')

    await waitFor(() => expect(layer()).not.toBeInTheDocument())
    expect(fullScreen()).toHaveFocus()
  })

  it('says when it changes, and waits for a controlled prop', async () => {
    const onExpandedChange = vi.fn()
    await renderMap(fakeEngine().engine, <Map.Toolbar expand />, {
      expanded: false,
      onExpandedChange
    })
    await userEvent.click(fullScreen())
    expect(onExpandedChange).toHaveBeenLastCalledWith(true)
    expect(layer()).not.toBeInTheDocument()
  })

  it('moves when a controlled prop changes, and says Escape asked', async () => {
    const onExpandedChange = vi.fn()
    const fake = fakeEngine()
    const view = (expanded: boolean) => (
      <MapProvider engine={fake.engine}>
        <Map
          defaultCenter={venue}
          expanded={expanded}
          onExpandedChange={onExpandedChange}
        >
          <Map.Toolbar expand />
        </Map>
      </MapProvider>
    )
    const { rerender } = render(view(false))
    await act(async () => {})
    rerender(view(true))
    expect(layer()).toContainElement(surface() as HTMLElement)

    await userEvent.keyboard('{Escape}')
    expect(onExpandedChange).toHaveBeenLastCalledWith(false)
    expect(layer()).toBeInTheDocument()
  })

  it('starts full screen with defaultExpanded', async () => {
    await renderMap(fakeEngine().engine, <Map.Toolbar expand />, {
      defaultExpanded: true
    })
    expect(layer()).toContainElement(surface() as HTMLElement)
    expect(exitFullScreen()).toBeInTheDocument()
  })

  it('locks the page’s scroll while full screen', async () => {
    const { unmount } = await renderMap(
      fakeEngine().engine,
      <Map.Toolbar expand />
    )
    await userEvent.click(fullScreen())
    await waitFor(() => expect(pageLocked()).toBe(true))

    await userEvent.click(exitFullScreen())
    await waitFor(() => expect(pageLocked()).toBe(false))

    await userEvent.click(fullScreen())
    await waitFor(() => expect(pageLocked()).toBe(true))
    unmount()
    await waitFor(() => expect(pageLocked()).toBe(false))
    expect(layer()).not.toBeInTheDocument()
  })

  it('lets one finger pan the map while full screen', async () => {
    const fake = fakeEngine()
    await renderMap(fake.engine, <Map.Toolbar expand />)
    expect(fake.instance.setCooperativeGestures).not.toHaveBeenCalled()

    await userEvent.click(fullScreen())
    expect(fake.instance.setCooperativeGestures).toHaveBeenLastCalledWith(false)
    await userEvent.click(exitFullScreen())
    expect(fake.instance.setCooperativeGestures).toHaveBeenLastCalledWith(true)
  })

  it('works with an engine that can’t change its gestures', async () => {
    const fake = fakeEngine()
    delete fake.instance.setCooperativeGestures
    await renderMap(fake.engine, <Map.Toolbar expand />)
    await userEvent.click(fullScreen())
    await userEvent.click(exitFullScreen())

    expect(fullScreen()).toBeInTheDocument()
  })

  it('keeps the intent around the map', async () => {
    const fake = fakeEngine()
    render(
      <div className='intent-brand'>
        <MapProvider engine={fake.engine}>
          <Map defaultCenter={venue} defaultExpanded />
        </MapProvider>
      </div>
    )
    await act(async () => {})

    expect(layer()).toHaveClass('intent-brand')
  })

  it('keeps a dark or light part of the page around the map', async () => {
    const fake = fakeEngine()
    render(
      <div className='dark'>
        <div data-theme='light'>
          <MapProvider engine={fake.engine}>
            <Map defaultCenter={venue} defaultExpanded />
          </MapProvider>
        </div>
      </div>
    )
    await act(async () => {})

    expect(layer()).toHaveAttribute('data-theme', 'light')
    expect(layer()).not.toHaveClass('dark')
  })

  it('keeps a dark part of the page around the map, by class', async () => {
    const fake = fakeEngine()
    render(
      <div className='dark'>
        <MapProvider engine={fake.engine}>
          <Map defaultCenter={venue} defaultExpanded />
        </MapProvider>
      </div>
    )
    await act(async () => {})

    expect(layer()).toHaveClass('dark')
  })

  it('keeps the accent of a nested theme', async () => {
    const fake = fakeEngine()
    render(
      <AccentScopeContext value={{ '--accent-hue': '200' } as CSSProperties}>
        <MapProvider engine={fake.engine}>
          <Map defaultCenter={venue} defaultExpanded />
        </MapProvider>
      </AccentScopeContext>
    )
    await act(async () => {})

    expect(layer()).toHaveAttribute('data-accent-scope')
    expect(layer()!.style.getPropertyValue('--accent-hue')).toBe('200')
  })

  it('exits only the top map on Escape', async () => {
    const fake = fakeEngine()
    const onParkingChange = vi.fn()
    const view = (parking: boolean) => (
      <MapProvider engine={fake.engine}>
        <Map defaultCenter={venue} aria-label='Venues' defaultExpanded />
        <Map
          defaultCenter={venue}
          aria-label='Parking'
          expanded={parking}
          onExpandedChange={onParkingChange}
        />
      </MapProvider>
    )
    const { rerender } = render(view(false))
    await act(async () => {})
    rerender(view(true))
    const named = (name: string) =>
      screen.queryByRole('dialog', { name, hidden: true })
    await waitFor(() =>
      expect(named('Parking')).toContainElement(
        document.activeElement as HTMLElement
      )
    )

    await userEvent.keyboard('{Escape}')
    expect(onParkingChange).toHaveBeenLastCalledWith(false)
    expect(named('Venues')).toHaveAttribute('data-open')
  })

  it('always offers a way out while full screen', async () => {
    const onExpandedChange = vi.fn()
    await renderMap(fakeEngine().engine, <Map.Toolbar />, {
      expanded: true,
      onExpandedChange
    })

    await userEvent.click(exitFullScreen())
    expect(onExpandedChange).toHaveBeenLastCalledWith(false)
  })

  it('offers a way out with no toolbar of its own', async () => {
    const onExpandedChange = vi.fn()
    await renderMap(fakeEngine().engine, null, {
      expanded: true,
      onExpandedChange
    })

    await userEvent.click(exitFullScreen())
    expect(onExpandedChange).toHaveBeenLastCalledWith(false)
  })
})
