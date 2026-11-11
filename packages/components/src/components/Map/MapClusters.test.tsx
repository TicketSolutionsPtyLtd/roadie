import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Map, type MapClusterBand } from './index'
import { fakeEngine, renderMap } from './mapTestUtils'

// Two suburbs a kilometre apart, one 4 km away, and a town 35 km out. The
// fake engine starts at zoom 14, where the three suburbs are one group.
const sales = [
  { position: { lat: -27.467, lng: 153.051 }, value: 40, label: 'New Farm' },
  { position: { lat: -27.457, lng: 153.047 }, value: 30, label: 'Teneriffe' },
  { position: { lat: -27.46, lng: 153.0 }, value: 50, label: 'Paddington' },
  { position: { lat: -27.614, lng: 152.76 }, value: 60, label: 'Ipswich' }
]

const bandNames = () =>
  screen
    .getAllByRole('button', { name: /^Ticket sales/ })
    .map((band) => band.getAttribute('aria-label'))

const band = (name: string) =>
  screen.getByRole('button', { name: `Ticket sales: ${name}` })

const renderClusters = async (
  props: Partial<Parameters<typeof Map.Clusters>[0]> = {},
  toolbar?: Parameters<typeof Map.Toolbar>[0]
) => {
  const fake = fakeEngine(undefined, { zoomScales: true })
  const map = await renderMap(
    fake.engine,
    <>
      {toolbar && <Map.Toolbar {...toolbar} />}
      <Map.Clusters data={sales} label='Ticket sales' {...props} />
    </>
  )
  const zoomTo = (zoom: number) =>
    act(() => {
      fake.instance.setView({ zoom })
    })
  return { ...map, fake, zoomTo }
}

describe('Map.Clusters', () => {
  it('adds up the places near each other, largest first', async () => {
    await renderClusters()

    expect(bandNames()).toEqual([
      'Ticket sales: 120, 67% of all',
      'Ticket sales: 60, 33% of all'
    ])
    expect(band('120, 67% of all')).toHaveTextContent('120')
  })

  it('shows each band’s value and its share of all the data', async () => {
    await renderClusters()
    expect(band('120, 67% of all').textContent).toBe('12067%')
  })

  it('shows only the value or the share with show, and names both', async () => {
    const { rerenderMap } = await renderClusters({ show: 'share' })
    expect(band('120, 67% of all').textContent).toBe('67%')

    await rerenderMap(
      <Map.Clusters data={sales} label='Ticket sales' show='value' />
    )
    expect(band('120, 67% of all').textContent).toBe('120')
  })

  it('highlights the bands holding the places named in highlight', async () => {
    const { rerenderMap, fake } = await renderClusters({
      highlight: 'Teneriffe'
    })
    const lit = () =>
      screen
        .getAllByRole('button', { name: /^Ticket sales/ })
        .filter((band) => band.hasAttribute('data-highlighted'))
        .map((band) => band.getAttribute('aria-label'))
    expect(lit()).toEqual(['Ticket sales: 120, 67% of all'])

    await rerenderMap(
      <Map.Clusters
        data={sales}
        label='Ticket sales'
        highlight={['Ipswich', 'New Farm']}
      />
    )
    expect(lit()).toEqual([
      'Ticket sales: 120, 67% of all',
      'Ticket sales: 60, 33% of all'
    ])

    await act(() => {
      fake.instance.setView({ zoom: 21 })
    })
    expect(lit()).toEqual([
      'Ticket sales: 60, 33% of all',
      'Ticket sales: 40, 22% of all'
    ])
  })

  it('highlights a spot by the label onGroupsChange gives it, when places share the spot', async () => {
    const spot = { lat: -27.467, lng: 153.051 }
    const data = [
      { position: spot, value: 3, label: 'Kazoo Hollow Room' },
      { position: spot, value: 4, label: 'Jumbuck Orchard Park' }
    ]
    const onGroupsChange = vi.fn<(bands: MapClusterBand[]) => void>()
    const { rerenderMap } = await renderClusters({ data, onGroupsChange })
    const [place] = onGroupsChange.mock.lastCall![0][0]!.places
    expect(place!.label).toBe('Kazoo Hollow Room and Jumbuck Orchard Park')

    await rerenderMap(
      <Map.Clusters data={data} label='Ticket sales' highlight={place!.label} />
    )
    expect(band('7, 100% of all')).toHaveAttribute('data-highlighted')
  })

  it('tells the app the bands on the map when they change', async () => {
    const onGroupsChange = vi.fn()
    const { fake, zoomTo } = await renderClusters({ onGroupsChange })
    const last = () =>
      onGroupsChange.mock.lastCall![0].map(
        ({ value, share, places }: MapClusterBand) => ({
          value,
          share: Math.round(share * 100),
          places: places.map(({ label }) => label)
        })
      )
    expect(last()).toEqual([
      {
        value: 120,
        share: 67,
        places: ['Paddington', 'New Farm', 'Teneriffe']
      },
      { value: 60, share: 33, places: ['Ipswich'] }
    ])

    // A pan that keeps the same bands says nothing.
    const calls = onGroupsChange.mock.calls.length
    await act(() => {
      fake.instance.setView({ center: { lat: -27.46, lng: 153.0 } })
    })
    expect(onGroupsChange).toHaveBeenCalledTimes(calls)

    await zoomTo(21)
    expect(last().map(({ value }: { value: number }) => value)).toEqual([
      60, 50, 40, 30
    ])
  })

  it('keys the colours with legend, up to the largest band at this zoom', async () => {
    const { zoomTo } = await renderClusters({
      legend: true,
      formatValue: (value) => `$${value}`
    })
    const legend = () =>
      document.querySelector('[data-slot="map-cluster-legend"]')
    expect(legend()).toHaveTextContent('Ticket sales')
    expect(legend()).toHaveTextContent('$0')
    expect(legend()).toHaveTextContent('$120')

    await zoomTo(21)
    expect(legend()).toHaveTextContent('$60')
  })

  it('has no legend unless asked', async () => {
    await renderClusters()
    expect(
      document.querySelector('[data-slot="map-cluster-legend"]')
    ).not.toBeInTheDocument()
  })

  it('marks a share under half a percent as under 1%', async () => {
    await renderClusters({
      data: [
        { position: { lat: -27.46, lng: 153.0 }, value: 999 },
        { position: { lat: -33.87, lng: 151.21 }, value: 1 }
      ]
    })
    expect(band('1, <1% of all')).toBeInTheDocument()
  })

  it('writes values with formatValue', async () => {
    await renderClusters({ formatValue: (value) => `$${value}` })
    expect(band('$120, 67% of all')).toHaveTextContent('$120')
  })

  it('splits groups as the map zooms in, down to single places', async () => {
    const { zoomTo } = await renderClusters()
    await zoomTo(21)

    expect(bandNames()).toEqual([
      'Ticket sales: 60, 33% of all',
      'Ticket sales: 50, 28% of all',
      'Ticket sales: 40, 22% of all',
      'Ticket sales: 30, 17% of all'
    ])
  })

  it('keeps its groups as the map pans at a whole zoom', async () => {
    // Two places 80px apart where a 512px world has doubled ten times, so
    // they are two bands there and one band a zoom further out.
    const pixel = 360 / (512 * 2 ** 10)
    const { fake } = await renderClusters({
      data: [
        { position: { lat: -27.46, lng: 153.03 }, value: 3 },
        { position: { lat: -27.46, lng: 153.03 + 80 * pixel }, value: 4 }
      ]
    })
    // Engines measure pixels from the world's edge, so they carry rounding.
    const scale = 1 / pixel
    fake.instance.project = ({ lat, lng }) => {
      const { center } = fake.instance.getView()
      return {
        x: 200 + (lng * scale - center.lng * scale),
        y: 150 - (lat * scale - center.lat * scale)
      }
    }

    for (let step = 0; step < 10; step++) {
      await act(() => {
        fake.instance.setView({
          center: { lat: -27.46, lng: 153.03 + step * pixel },
          zoom: 14 + Math.log2(scale / 1000)
        })
      })
      expect(bandNames()).toHaveLength(2)
    }
  })

  it('zooms in until a group splits, and moves focus to its largest part', async () => {
    const { fake } = await renderClusters()
    const group = band('120, 67% of all')
    expect(group).toHaveAccessibleDescription('Zooms in to split it')

    await userEvent.click(group)

    expect(fake.instance.setView).toHaveBeenLastCalledWith(
      expect.objectContaining({ center: expect.any(Object) }),
      { animate: true }
    )
    expect(bandNames()).not.toContain('Ticket sales: 120, 67% of all')
    expect(document.activeElement).toBe(band('70, 39% of all'))
  })

  it('still moves focus when the click interrupts a move, as a quick second click does', async () => {
    const { fake } = await renderClusters()
    const setView = vi.mocked(fake.instance.setView)
    const moveTo = setView.getMockImplementation()!
    // An engine ends the move it interrupts before it starts the new one.
    setView.mockImplementationOnce((next, options) => {
      moveTo({}, options)
      moveTo(next, options)
    })

    await userEvent.click(band('120, 67% of all'))

    expect(document.activeElement).toBe(band('70, 39% of all'))
  })

  it('moves no focus later when the zoom stops short of the split', async () => {
    const { fake, zoomTo } = await renderClusters()
    // The ease stops where it started, as when the reader zooms away.
    vi.mocked(fake.instance.setView).mockImplementationOnce(() => {})
    await userEvent.click(band('120, 67% of all'))
    fake.pan(fake.instance.getView().center)

    // A zoom of the reader's own splits the group later, and no band takes
    // the focus its band had.
    await zoomTo(21)
    expect(document.activeElement).toBe(document.body)
  })

  it('leaves focus where the reader moved it while the map zoomed', async () => {
    const { fake, zoomTo } = await renderClusters({}, {})
    // The ease is still on its way when the reader moves on.
    vi.mocked(fake.instance.setView).mockImplementationOnce(() => {})
    await userEvent.click(band('120, 67% of all'))
    const zoomIn = screen.getByRole('button', { name: 'Zoom in' })
    act(() => zoomIn.focus())

    await zoomTo(21)
    expect(document.activeElement).toBe(zoomIn)
  })

  it('says a band opens a preview only when it does, not when it zooms', async () => {
    const { zoomTo } = await renderClusters()
    const group = band('120, 67% of all')
    expect(group).not.toHaveAttribute('aria-haspopup')
    expect(group).not.toHaveAttribute('aria-expanded')

    await zoomTo(21)
    const place = band('40, 22% of all')
    expect(place).toHaveAttribute('aria-haspopup', 'dialog')
    expect(place).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(place)
    expect(place).toHaveAttribute('aria-expanded', 'true')
  })

  it('shows a single place’s name in its preview', async () => {
    const { zoomTo } = await renderClusters()
    await zoomTo(21)
    const place = band('40, 22% of all')
    expect(place).not.toHaveAccessibleDescription()

    await userEvent.click(place)

    const preview = await screen.findByRole('dialog')
    expect(within(preview).getByText('Ticket sales: 40')).toBeInTheDocument()
    expect(within(preview).getByText('22% of all')).toBeInTheDocument()
    expect(within(preview).getByText('New Farm')).toBeInTheDocument()
  })

  it('keeps its groups while locked, and previews them instead of zooming', async () => {
    const { fake, zoomTo } = await renderClusters({ locked: true })
    await zoomTo(21)

    expect(bandNames()).toEqual([
      'Ticket sales: 120, 67% of all',
      'Ticket sales: 60, 33% of all'
    ])
    vi.mocked(fake.instance.setView).mockClear()
    await userEvent.click(band('120, 67% of all'))

    expect(fake.instance.setView).not.toHaveBeenCalled()
    const preview = await screen.findByRole('dialog')
    expect(within(preview).getByText('67% of all, within 3 km')).toBeVisible()
    expect(
      within(preview).getByText('Paddington, New Farm and Teneriffe')
    ).toBeVisible()
  })

  it('splits the groups again once unlocked', async () => {
    const { rerenderMap, zoomTo } = await renderClusters({ locked: true })
    await zoomTo(21)
    expect(bandNames()).toHaveLength(2)

    await rerenderMap(
      <Map.Clusters data={sales} label='Ticket sales' locked={false} />
    )
    expect(bandNames()).toHaveLength(4)
  })

  it('takes Show all to every place in the data', async () => {
    const { fake } = await renderClusters({}, { fit: true })
    await userEvent.click(screen.getByRole('button', { name: 'Show all' }))

    expect(fake.instance.fitBounds).toHaveBeenCalledWith(
      {
        southWest: { lat: -27.614, lng: 152.76 },
        northEast: { lat: -27.457, lng: 153.051 }
      },
      expect.anything()
    )
  })

  it('takes a point for each sale, 150,000 of them, and fits them all', async () => {
    // Spots about half a metre apart, so they share a few bands at zoom 14.
    const data = Array.from({ length: 150_000 }, (_, i) => ({
      position: {
        lat: -27.46 - Math.floor(i / 400) * 0.000005,
        lng: 153.02 + (i % 400) * 0.000005
      }
    }))
    const { fake } = await renderClusters({ data }, { fit: true })

    const total = screen
      .getAllByRole('button', { name: /^Ticket sales/ })
      .map((band) => Number(band.firstChild?.textContent?.replace(/,/g, '')))
      .reduce((sum, value) => sum + value, 0)
    expect(total).toBe(150_000)

    await userEvent.click(screen.getByRole('button', { name: 'Show all' }))
    expect(fake.instance.fitBounds).toHaveBeenCalledWith(
      {
        southWest: { lat: expect.closeTo(-27.46187, 5), lng: 153.02 },
        northEast: { lat: -27.46, lng: expect.closeTo(153.021995, 5) }
      },
      expect.anything()
    )
  })

  it('previews a group of 150,000 points while locked', async () => {
    const data = Array.from({ length: 150_000 }, (_, i) => ({
      position: { lat: -27.46, lng: 153.02 + i * 0.00000001 }
    }))
    await renderClusters({ data, locked: true })

    await userEvent.click(band('150,000, 100% of all'))
    expect(await screen.findByText('Ticket sales: 150,000')).toBeInTheDocument()
  })

  it('fits only the points that have a position', async () => {
    const { fake } = await renderClusters(
      {
        data: [
          ...sales,
          { position: { lat: Number.NaN, lng: Number.NaN }, value: 5 }
        ]
      },
      { fit: true }
    )
    await userEvent.click(screen.getByRole('button', { name: 'Show all' }))

    expect(fake.instance.fitBounds).toHaveBeenCalledWith(
      {
        southWest: { lat: -27.614, lng: 152.76 },
        northEast: { lat: -27.457, lng: 153.051 }
      },
      expect.anything()
    )
  })

  it('draws nothing with no data', async () => {
    await renderClusters({ data: [] })
    expect(
      screen.queryByRole('button', { name: /^Ticket sales/ })
    ).not.toBeInTheDocument()
  })
})
