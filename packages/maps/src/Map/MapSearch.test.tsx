import { useState } from 'react'

import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, onTestFinished, vi } from 'vitest'

import { Map, type Place } from './index'
import { fakeEngine, renderMap } from './mapTestUtils'

const kazoo: Place = {
  label: 'Kazoo Hollow Room',
  address: 'Fortitude Valley QLD 4006',
  position: { lat: -27.4575, lng: 153.0355 }
}
const echidna: Place = {
  label: 'Echidna Gaslight Theatre',
  address: 'Newstead QLD 4006',
  position: { lat: -27.4462, lng: 153.0448 },
  zoom: 17
}

/** A suggest whose answers the test hands back, in any order. */
function deferredSuggest() {
  const calls: {
    text: string
    signal: AbortSignal
    resolve: (places: readonly Place[]) => void
    reject: (reason: unknown) => void
  }[] = []
  const suggest = vi.fn(
    (text: string, { signal }: { signal: AbortSignal }) =>
      new Promise<readonly Place[]>((resolve, reject) => {
        calls.push({ text, signal, resolve, reject })
      })
  )
  return { suggest, calls }
}

/**
 * Fakes timers for the rest of the test, and gives a user that waits on none.
 * Testing Library advances fake timers only when it sees Jest's, so it's
 * shown Vitest's under that name.
 */
function fakeTimers() {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  vi.stubGlobal('jest', { advanceTimersByTime: vi.advanceTimersByTime })
  onTestFinished(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })
  return userEvent.setup({ delay: null })
}
const wait = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))

const input = () => screen.getByRole('combobox', { name: 'Search the map' })
const status = () =>
  document.querySelector<HTMLElement>('[data-slot=autocomplete-status]')!

describe('Map.Search', () => {
  it('is a combobox named for the map, with a placeholder', async () => {
    await renderMap(fakeEngine().engine, <Map.Search suggest={() => []} />)
    expect(input()).toHaveAttribute('placeholder', 'Search for a place')
  })

  it('waits for typing to pause before it asks', async () => {
    const suggest = vi.fn(() => [kazoo])
    await renderMap(fakeEngine().engine, <Map.Search suggest={suggest} />)
    const user = fakeTimers()

    // Letters typed a little under the pause apart are one search.
    await user.type(input(), 'K')
    await wait(200)
    await user.type(input(), 'a')
    await wait(200)
    await user.type(input(), 'z')
    await wait(249)
    expect(suggest).not.toHaveBeenCalled()

    await wait(1)
    expect(suggest).toHaveBeenCalledTimes(1)
    expect(suggest).toHaveBeenCalledWith('Kaz', {
      signal: expect.any(AbortSignal)
    })
    expect(
      screen.getByRole('option', { name: /Kazoo Hollow Room/ })
    ).toBeInTheDocument()
  })

  it('stops the last request, and never shows its late answer', async () => {
    const { suggest, calls } = deferredSuggest()
    await renderMap(fakeEngine().engine, <Map.Search suggest={suggest} />)
    await userEvent.type(input(), 'T')
    await waitFor(() => expect(calls).toHaveLength(1))
    await userEvent.type(input(), 'h')
    await waitFor(() => expect(calls).toHaveLength(2))

    expect(calls[0]!.signal.aborted).toBe(true)
    expect(calls[1]!.text).toBe('Th')
    // The first answer comes back last, after the map asked again.
    await act(async () => calls[0]!.resolve([kazoo]))
    expect(
      screen.queryByRole('option', { name: /Kazoo Hollow Room/ })
    ).not.toBeInTheDocument()
    expect(status()).toHaveTextContent('Searching…')

    calls[1]!.resolve([echidna])
    expect(
      await screen.findByRole('option', { name: /Echidna Gaslight Theatre/ })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('option', { name: /Kazoo Hollow Room/ })
    ).not.toBeInTheDocument()
  })

  it('says what it’s doing in a live status', async () => {
    const { suggest, calls } = deferredSuggest()
    await renderMap(fakeEngine().engine, <Map.Search suggest={suggest} />)
    expect(status()).toHaveAttribute('role', 'status')
    expect(status()).toHaveTextContent('')

    await userEvent.type(input(), 'Valley')
    expect(status()).toHaveTextContent('Searching…')
    await waitFor(() => expect(calls).toHaveLength(1))
    calls[0]!.resolve([kazoo, echidna])
    await waitFor(() => expect(status()).toHaveTextContent('2 places found'))

    await userEvent.type(input(), 'x')
    await waitFor(() => expect(calls).toHaveLength(2))
    calls[1]!.resolve([kazoo])
    await waitFor(() => expect(status()).toHaveTextContent('1 place found'))

    await userEvent.type(input(), 'x')
    await waitFor(() => expect(calls).toHaveLength(3))
    calls[2]!.resolve([])
    await waitFor(() => expect(status()).toHaveTextContent('No places found'))
    expect(
      screen.getByText('No places found', {
        ignore: '[data-slot=autocomplete-status]'
      })
    ).toBeVisible()
  })

  it('shows an error when suggest fails, without throwing', async () => {
    const suggest = vi.fn(() => Promise.reject(new Error('503')))
    await renderMap(fakeEngine().engine, <Map.Search suggest={suggest} />)
    await userEvent.type(input(), 'Kazoo')

    await waitFor(() =>
      expect(status()).toHaveTextContent('Places couldn’t load. Try again.')
    )
    const error = screen.getByText('Places couldn’t load. Try again.', {
      ignore: '[data-slot=autocomplete-status]'
    })
    expect(error).toBeVisible()
    expect(error).toHaveClass('intent-danger')
  })

  it('doesn’t colour no places as an error', async () => {
    await renderMap(fakeEngine().engine, <Map.Search suggest={() => []} />)
    await userEvent.type(input(), 'Kazoo')
    const none = await screen.findByText('No places found', {
      ignore: '[data-slot=autocomplete-status]'
    })
    expect(none).not.toHaveClass('intent-danger')
  })

  it('tries a failed search again when its list reopens', async () => {
    const suggest = vi
      .fn<(text: string) => Promise<readonly Place[]>>()
      .mockRejectedValueOnce(new Error('503'))
      .mockResolvedValue([kazoo])
    await renderMap(fakeEngine().engine, <Map.Search suggest={suggest} />)
    await userEvent.type(input(), 'Kazoo')
    await waitFor(() =>
      expect(status()).toHaveTextContent('Places couldn’t load. Try again.')
    )

    await userEvent.keyboard('{Escape}')
    await waitFor(() =>
      expect(
        screen.queryByText('Places couldn’t load. Try again.', {
          ignore: '[data-slot=autocomplete-status]'
        })
      ).not.toBeInTheDocument()
    )
    await userEvent.keyboard('{ArrowDown}')
    expect(status()).toHaveTextContent('Searching…')
    expect(
      await screen.findByRole('option', { name: /Kazoo Hollow Room/ })
    ).toBeInTheDocument()
    expect(suggest).toHaveBeenCalledTimes(2)
    expect(suggest).toHaveBeenLastCalledWith('Kazoo', {
      signal: expect.any(AbortSignal)
    })
  })

  it('doesn’t ask again when a search that worked reopens', async () => {
    const suggest = vi.fn(() => [kazoo])
    await renderMap(fakeEngine().engine, <Map.Search suggest={suggest} />)
    await userEvent.type(input(), 'Kaz')
    await screen.findByRole('option', { name: /Kazoo Hollow Room/ })
    await userEvent.keyboard('{Escape}')
    await waitFor(() =>
      expect(screen.queryByRole('option')).not.toBeInTheDocument()
    )
    const user = fakeTimers()
    await user.keyboard('{ArrowDown}')
    await wait(1_000)
    expect(suggest).toHaveBeenCalledTimes(1)
    expect(status()).toHaveTextContent('1 place found')
  })

  it('asks nothing and says nothing for empty text', async () => {
    const suggest = vi.fn(() => [kazoo])
    await renderMap(fakeEngine().engine, <Map.Search suggest={suggest} />)
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    onTestFinished(() => {
      vi.useRealTimers()
    })
    const typeAndWait = async (value: string) => {
      fireEvent.change(input(), { target: { value } })
      await act(() => vi.advanceTimersByTimeAsync(1_000))
    }

    await typeAndWait('   ')
    expect(suggest).not.toHaveBeenCalled()
    expect(status()).toHaveTextContent('')
    expect(screen.queryByRole('option')).not.toBeInTheDocument()

    await typeAndWait('Kaz')
    expect(suggest).toHaveBeenCalledTimes(1)
    expect(status()).toHaveTextContent('1 place found')

    await typeAndWait('')
    expect(suggest).toHaveBeenCalledTimes(1)
    expect(status()).toHaveTextContent('')
    expect(screen.queryByRole('option')).not.toBeInTheDocument()
  })

  it('flies to the chosen place and says which it was', async () => {
    const fake = fakeEngine()
    const onPlaceSelect = vi.fn()
    const suggest = vi.fn(() => [kazoo, echidna])
    await renderMap(
      fake.engine,
      <Map.Search suggest={suggest} onPlaceSelect={onPlaceSelect} />
    )
    const user = fakeTimers()
    await user.type(input(), 'Hall')
    await wait(250)
    await user.click(screen.getByRole('option', { name: /Kazoo Hollow Room/ }))

    expect(fake.instance.setView).toHaveBeenLastCalledWith(
      { center: kazoo.position, zoom: 16 },
      { animate: true }
    )
    expect(onPlaceSelect).toHaveBeenCalledWith(kazoo)
    expect(input()).toHaveValue('Kazoo Hollow Room')
    // The place's name in the input isn't a new search.
    expect(status()).not.toHaveTextContent('Searching…')
    await wait(1_000)
    expect(suggest).toHaveBeenCalledTimes(1)
    expect(status()).toHaveTextContent('2 places found')
  })

  it('leaves a map with defaultFit where the search sent it, when the place drops a pin', async () => {
    const fake = fakeEngine()
    const suburb: Place = { ...kazoo, label: 'Fortitude Valley' }
    function Chosen() {
      const [value, setValue] = useState<Place | null>(null)
      return (
        <>
          <Map.Search suggest={() => [suburb]} onPlaceSelect={setValue} />
          <Map.Picker value={value} onValueChange={setValue} />
        </>
      )
    }
    await renderMap(fake.engine, <Chosen />, { defaultFit: true })
    const user = fakeTimers()
    // Tabbed to, so typing is the first use of the map.
    act(() => input().focus())
    await user.keyboard('Valley')
    await wait(250)
    await user.click(screen.getByRole('option', { name: /Fortitude Valley/ }))

    // The pin is the first thing on the map, which mustn't fit to it.
    expect(
      screen.getByRole('button', { name: 'Chosen place' })
    ).toBeInTheDocument()
    expect(fake.instance.fitBounds).not.toHaveBeenCalled()
  })

  it('takes the first place on Enter, at its own zoom', async () => {
    const fake = fakeEngine()
    const onPlaceSelect = vi.fn()
    const suggest = vi.fn(() => [echidna])
    await renderMap(
      fake.engine,
      <Map.Search suggest={suggest} onPlaceSelect={onPlaceSelect} />
    )
    const user = fakeTimers()
    await user.type(input(), 'Ech')
    await wait(250)
    screen.getByRole('option', { name: /Echidna Gaslight Theatre/ })
    await user.keyboard('{Enter}')

    expect(fake.instance.setView).toHaveBeenLastCalledWith(
      { center: echidna.position, zoom: 17 },
      { animate: true }
    )
    expect(onPlaceSelect).toHaveBeenCalledWith(echidna)
    expect(status()).not.toHaveTextContent('Searching…')
    await wait(1_000)
    expect(suggest).toHaveBeenCalledTimes(1)
  })

  it('takes no place on Enter while newer text is searching', async () => {
    const fake = fakeEngine()
    const onPlaceSelect = vi.fn()
    const suggest = vi.fn((text: string) =>
      text.includes('Ech') ? [echidna] : [kazoo, echidna]
    )
    await renderMap(
      fake.engine,
      <Map.Search suggest={suggest} onPlaceSelect={onPlaceSelect} />
    )
    await userEvent.type(input(), 'The')
    await screen.findByRole('option', { name: /Kazoo Hollow Room/ })

    await userEvent.type(input(), ' Ech{Enter}')
    expect(status()).toHaveTextContent('Searching…')
    expect(onPlaceSelect).not.toHaveBeenCalled()
    expect(fake.instance.setView).not.toHaveBeenCalled()

    // Once its own places land, Enter takes the first.
    await waitFor(() => expect(status()).toHaveTextContent('1 place found'))
    await userEvent.keyboard('{Enter}')
    expect(onPlaceSelect).toHaveBeenCalledWith(echidna)
  })

  it('lists none of the last search’s places after the text is cleared', async () => {
    const onPlaceSelect = vi.fn()
    await renderMap(
      fakeEngine().engine,
      <Map.Search
        suggest={(text) => (text === 'Kaz' ? [kazoo] : [echidna])}
        onPlaceSelect={onPlaceSelect}
      />
    )
    await userEvent.type(input(), 'Kaz')
    await screen.findByRole('option', { name: /Kazoo Hollow Room/ })
    await userEvent.clear(input())
    await userEvent.type(input(), 'Ech{Enter}')

    expect(
      screen.queryByRole('option', { name: /Kazoo Hollow Room/ })
    ).not.toBeInTheDocument()
    expect(onPlaceSelect).not.toHaveBeenCalled()
  })

  it('takes its own name and placeholder', async () => {
    await renderMap(
      fakeEngine().engine,
      <Map.Search
        suggest={() => []}
        aria-label='Find a venue'
        placeholder='Venue or address'
      />
    )
    expect(
      screen.getByRole('combobox', { name: 'Find a venue' })
    ).toHaveAttribute('placeholder', 'Venue or address')
  })

  it('opens its list inside the map while it fills the window', async () => {
    await renderMap(
      fakeEngine().engine,
      <Map.Search suggest={() => [kazoo]} />,
      { defaultExpanded: true }
    )
    await userEvent.type(input(), 'Kaz')
    const option = await screen.findByRole('option', {
      name: /Kazoo Hollow Room/
    })
    expect(screen.getByRole('dialog', { name: 'Map' })).toContainElement(option)
  })
})
