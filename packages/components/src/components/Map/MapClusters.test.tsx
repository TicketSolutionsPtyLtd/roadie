import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Map } from './index'
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

  it('shows each band’s share of all the data', async () => {
    await renderClusters({ show: 'percent' })
    expect(band('120, 67% of all')).toHaveTextContent('67%')
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
    const { fake, zoomTo } = await renderClusters({ defaultLocked: true })
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

  it('locks and unlocks from Map.Toolbar', async () => {
    const { zoomTo } = await renderClusters({}, { lock: true })
    const lock = screen.getByRole('button', { name: 'Lock groups' })
    expect(lock).toHaveAttribute('aria-pressed', 'false')

    await userEvent.click(lock)
    expect(lock).toHaveAttribute('aria-pressed', 'true')
    await zoomTo(21)
    expect(bandNames()).toHaveLength(2)

    await userEvent.click(lock)
    expect(lock).toHaveAttribute('aria-pressed', 'false')
    expect(bandNames()).toHaveLength(4)
  })

  it('asks before locking when controlled', async () => {
    const onLockedChange = vi.fn()
    const { zoomTo } = await renderClusters(
      { locked: false, onLockedChange },
      { lock: true }
    )
    await userEvent.click(screen.getByRole('button', { name: 'Lock groups' }))

    expect(onLockedChange).toHaveBeenCalledWith(true)
    await zoomTo(21)
    expect(bandNames()).toHaveLength(4)
  })

  it('turns the lock button off with no clusters on the map', async () => {
    await renderMap(fakeEngine().engine, <Map.Toolbar lock />)
    expect(screen.getByRole('button', { name: 'Lock groups' })).toBeDisabled()
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

  it('draws nothing with no data', async () => {
    await renderClusters({ data: [] })
    expect(
      screen.queryByRole('button', { name: /^Ticket sales/ })
    ).not.toBeInTheDocument()
  })
})
