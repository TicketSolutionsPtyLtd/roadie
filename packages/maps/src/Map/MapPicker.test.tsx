import { useState } from 'react'

import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { describe, expect, it, vi } from 'vitest'

import { Field } from '@oztix/roadie-components/field'

import { MapProvider } from './MapProvider'
import type { LatLng } from './engine'
import { Map } from './index'
import { fakeEngine, renderMap, venue } from './mapTestUtils'
import type { Place } from './place'

const east = { lat: venue.lat, lng: venue.lng + 0.05 }
const at = (position: LatLng, label = 'Kazoo Hollow Room'): Place => ({
  label,
  position
})
const pinButton = () => screen.getByRole('button', { name: 'Chosen place' })

describe('Map.Picker', () => {
  it('keeps the drop and its round ring when pin is false', async () => {
    await renderMap(
      fakeEngine().engine,
      <Map.Picker defaultValue={at(venue)} label='Entrance' pin={false} />
    )
    const picker = screen.getByRole('button', { name: 'Entrance' })
    expect(picker.querySelector('[data-slot=map-pin]')).not.toBeNull()
    expect(picker).toHaveClass('rounded-full')
  })

  it('draws a custom pin in place of the drop', async () => {
    await renderMap(
      fakeEngine().engine,
      <Map.Picker defaultValue={at(venue)} pin={<svg data-testid='spot' />} />
    )
    expect(within(pinButton()).getByTestId('spot')).toBeInTheDocument()
    expect(pinButton().querySelector('[data-slot=map-pin]')).toBeNull()
  })

  it('shows no pin until the map is clicked, then drops it there', async () => {
    const fake = fakeEngine()
    const onValueChange = vi.fn()
    await renderMap(fake.engine, <Map.Picker onValueChange={onValueChange} />)
    expect(
      screen.queryByRole('button', { name: 'Chosen place' })
    ).not.toBeInTheDocument()

    await fake.click(east)
    expect(onValueChange).toHaveBeenCalledWith({
      label: '',
      position: east,
      precision: 'manual'
    })
    expect(pinButton().closest('[data-slot=map-picker]')).toHaveStyle({
      transform: 'translate(250px, 150px)'
    })
  })

  it('drops the pin at the centre from the keyboard, then focuses it', async () => {
    const onValueChange = vi.fn()
    await renderMap(
      fakeEngine().engine,
      <Map.Picker onValueChange={onValueChange} />
    )

    await userEvent.click(
      screen.getByRole('button', { name: 'Drop the pin here' })
    )
    expect(onValueChange).toHaveBeenCalledWith({
      label: '',
      position: venue,
      precision: 'manual'
    })
    expect(pinButton()).toHaveFocus()
    expect(
      screen.queryByRole('button', { name: 'Drop the pin here' })
    ).toBeNull()
  })

  it('leaves focus alone when its keyboard drop was refused and a place comes later', async () => {
    function Refusing() {
      const [place, setPlace] = useState<Place | null>(null)
      return (
        <>
          <button type='button' onClick={() => setPlace(at(east))}>
            Use the east address
          </button>
          <Map.Picker value={place} />
        </>
      )
    }
    await renderMap(fakeEngine().engine, <Refusing />)
    await userEvent.click(
      screen.getByRole('button', { name: 'Drop the pin here' })
    )
    const useEast = screen.getByRole('button', { name: 'Use the east address' })
    await userEvent.click(useEast)

    expect(useEast).toHaveFocus()
  })

  it('forgets where a place came from once the pin moves', async () => {
    const onValueChange = vi.fn()
    await renderMap(
      fakeEngine().engine,
      <Map.Picker
        defaultValue={{
          ...at(venue),
          source: { provider: 'AddressFinder', id: 'af-1' }
        }}
        onValueChange={onValueChange}
      />
    )
    pinButton().focus()
    await userEvent.keyboard('{ArrowRight}')

    expect(onValueChange.mock.lastCall![0]).not.toHaveProperty('source')
  })

  it('offers no drop button while disabled', async () => {
    await renderMap(fakeEngine().engine, <Map.Picker disabled />)

    expect(
      screen.queryByRole('button', { name: 'Drop the pin here' })
    ).toBeNull()
  })

  it('nudges the pin with the arrow keys, keeping its label', async () => {
    const onValueChange = vi.fn()
    await renderMap(
      fakeEngine().engine,
      <Map.Picker defaultValue={at(venue)} onValueChange={onValueChange} />
    )
    pinButton().focus()

    await userEvent.keyboard('{ArrowRight}')
    const nudged = onValueChange.mock.calls[0]![0] as Place
    expect(nudged.position.lng).toBeCloseTo(venue.lng + 0.008)
    expect(nudged).toMatchObject({
      label: 'Kazoo Hollow Room',
      precision: 'manual'
    })
    await userEvent.keyboard('{Shift>}{ArrowUp}{/Shift}')
    const further = onValueChange.mock.calls[1]![0] as Place
    expect(further.position.lat).toBeCloseTo(venue.lat + 0.04)
  })

  it('keeps a controlled value until the parent changes it', async () => {
    const fake = fakeEngine()
    const onValueChange = vi.fn()
    await renderMap(
      fake.engine,
      <Map.Picker value={null} onValueChange={onValueChange} />
    )
    await fake.click(east)

    expect(onValueChange).toHaveBeenCalledWith(
      expect.objectContaining({ position: east })
    )
    expect(
      screen.queryByRole('button', { name: 'Chosen place' })
    ).not.toBeInTheDocument()
  })

  it('counts its place when the map fits to its places', async () => {
    const fake = fakeEngine()
    await renderMap(
      fake.engine,
      <>
        <Map.Toolbar fit />
        <Map.Picker defaultValue={at(east)} />
      </>
    )

    await userEvent.click(screen.getByRole('button', { name: 'Show all' }))
    expect(fake.instance.fitBounds).toHaveBeenLastCalledWith(
      { southWest: east, northEast: east },
      expect.anything()
    )
  })
})

describe('Map.Picker in a form', () => {
  function PickerInForm({
    field = {},
    value = at(venue)
  }: {
    field?: { invalid?: boolean; required?: boolean; disabled?: boolean }
    value?: Place | null
  }) {
    return (
      <MapProvider engine={engine}>
        <form aria-label='Venue'>
          <Field {...field}>
            <Field.Label>Entrance</Field.Label>
            <Map defaultCenter={venue}>
              <Map.Picker name='entrance' defaultValue={value} />
            </Map>
            <Field.HelperText>Drag the pin onto the door</Field.HelperText>
            <Field.ErrorText>Choose the entrance</Field.ErrorText>
          </Field>
        </form>
      </MapProvider>
    )
  }
  let engine: ReturnType<typeof fakeEngine>['engine']

  const renderForm = async (props?: Parameters<typeof PickerInForm>[0]) => {
    const fake = fakeEngine()
    engine = fake.engine
    render(<PickerInForm {...props} />)
    await act(async () => {})
    return fake
  }
  const form = () =>
    screen.getByRole('form', { name: 'Venue' }) as HTMLFormElement
  // Named by the field's label, as the picker has no label of its own.
  const entrancePin = () => screen.getByRole('button', { name: 'Entrance' })

  it('submits its place as lat,lng under its name', async () => {
    await renderForm()

    expect(new FormData(form()).get('entrance')).toBe('-27.457500,153.035500')
  })

  it('submits nothing with no place chosen', async () => {
    await renderForm({ value: null })

    expect(new FormData(form()).get('entrance')).toBe('')
  })

  it('stops a required form submitting until a place is chosen', async () => {
    const fake = await renderForm({ field: { required: true }, value: null })
    expect(form().checkValidity()).toBe(false)

    await fake.click(east)
    expect(form().checkValidity()).toBe(true)
  })

  it('takes the field’s help and invalid state', async () => {
    await renderForm({ field: { invalid: true, required: true } })

    expect(entrancePin()).toHaveAttribute('aria-invalid', 'true')
    expect(entrancePin()).toHaveAccessibleDescription('Choose the entrance')
  })

  it('gives the pin only the states a button can carry', async () => {
    await renderForm({ field: { invalid: true, required: true } })

    const { violations } = await axe.run(form(), {
      runOnly: ['aria-allowed-attr']
    })
    expect(violations.map(({ id }) => id)).toEqual([])
  })

  it('names the pin from the field’s label', async () => {
    await renderForm()

    expect(entrancePin()).toHaveAttribute('aria-roledescription', 'movable pin')
  })

  it('takes the name of a label of its own over the field’s', async () => {
    const fake = fakeEngine()
    engine = fake.engine
    render(
      <MapProvider engine={engine}>
        <Field>
          <Field.Label>Venue</Field.Label>
          <Map defaultCenter={venue}>
            <Map.Picker defaultValue={at(venue)} label='Entrance' />
          </Map>
        </Field>
      </MapProvider>
    )
    await act(async () => {})

    expect(entrancePin()).toBeInTheDocument()
  })

  it('describes the pin with the field’s help text', async () => {
    await renderForm()

    expect(entrancePin()).toHaveAccessibleDescription(
      'Drag the pin onto the door'
    )
  })

  it('stays put while the field is disabled', async () => {
    const fake = await renderForm({ field: { disabled: true } })
    expect(entrancePin()).toBeDisabled()

    await fake.click(east)
    expect(entrancePin().closest('[data-slot=map-picker]')).toHaveStyle({
      transform: 'translate(200px, 150px)'
    })
    expect(new FormData(form()).get('entrance')).toBeNull()
  })
})

describe('Map.Picker in a form, around the rest of the map', () => {
  let engine: ReturnType<typeof fakeEngine>['engine']
  function Form({ expanded = false }: { expanded?: boolean }) {
    return (
      <MapProvider engine={engine}>
        <form aria-label='Venue'>
          <Field required invalid>
            <Field.Label>Entrance</Field.Label>
            <Map defaultCenter={venue} defaultExpanded={expanded}>
              <Map.Search suggest={() => []} />
              <Map.Picker name='entrance' defaultValue={at(venue)} />
            </Map>
            <Field.ErrorText>Choose the entrance</Field.ErrorText>
          </Field>
        </form>
      </MapProvider>
    )
  }
  const renderForm = async (expanded?: boolean) => {
    engine = fakeEngine().engine
    render(<Form expanded={expanded} />)
    await act(async () => {})
  }
  it('keeps the field’s states on the picker, not the search', async () => {
    await renderForm()
    const search = screen.getByRole('combobox', { name: 'Search the map' })

    expect(search).not.toHaveAttribute('aria-required')
    expect(search).not.toHaveAttribute('aria-invalid')
    expect(search).not.toHaveAccessibleDescription('Choose the entrance')
    expect(
      screen.getByRole('button', { name: 'Entrance' })
    ).toHaveAccessibleDescription('Choose the entrance')
  })

  it('still submits its place while the map is full screen', async () => {
    await renderForm(true)
    // The full screen map is modal, so the page's form is hidden from roles.
    const page = document.querySelector('form')!
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    expect(new FormData(page).get('entrance')).toBe('-27.457500,153.035500')
  })
})

describe('Map.Picker from outside the map', () => {
  // A form beside the map that sets the place, as an address search would.
  function PickerForm({
    onPick,
    keep = (place) => place
  }: {
    onPick?: (place: Place) => void
    // What the form stores of the pin's place, such as it rounded.
    keep?: (place: Place) => Place
  }) {
    const [place, setPlace] = useState<Place | null>(at(venue))
    return (
      <>
        <button type='button' onClick={() => setPlace(at(east, 'East'))}>
          Use the east address
        </button>
        <button type='button' onClick={() => setPlace(null)}>
          Clear the address
        </button>
        <Map.Picker
          value={place}
          onValueChange={(next) => {
            setPlace(keep(next))
            onPick?.(next)
          }}
        />
      </>
    )
  }

  // A form that stores the pin's places a step behind, as one saving each
  // to a server or the address bar would.
  function LateForm() {
    const [place, setPlace] = useState<Place | null>(at(venue))
    const [queue] = useState<Place[]>([])
    return (
      <>
        <button type='button' onClick={() => setPlace(queue.shift()!)}>
          Store the next place
        </button>
        <Map.Picker value={place} onValueChange={(next) => queue.push(next)} />
      </>
    )
  }

  it('leaves the map where it is when the form rounds the place it stores', async () => {
    const fake = fakeEngine()
    const round = (place: Place): Place => ({
      ...place,
      position: {
        lat: Number(place.position.lat.toFixed(4)),
        lng: Number(place.position.lng.toFixed(4))
      }
    })
    await renderMap(fake.engine, <PickerForm keep={round} />)
    await fake.click({
      lat: venue.lat + 0.001234567,
      lng: venue.lng + 0.012345
    })
    pinButton().focus()
    await userEvent.keyboard('{ArrowUp}')

    expect(fake.instance.setView).not.toHaveBeenCalled()
  })

  it('leaves the map where it is when the form stores its places late', async () => {
    const fake = fakeEngine()
    await renderMap(fake.engine, <LateForm />)
    await fake.click(east)
    await fake.click({ lat: east.lat + 0.01, lng: east.lng })
    const store = screen.getByRole('button', { name: 'Store the next place' })
    await userEvent.click(store)
    await userEvent.click(store)

    expect(fake.instance.setView).not.toHaveBeenCalled()
  })

  it('brings a place back into view after the form clears it', async () => {
    const fake = fakeEngine()
    await renderMap(fake.engine, <PickerForm />)
    const useEast = screen.getByRole('button', { name: 'Use the east address' })
    await userEvent.click(useEast)
    await fake.pan(venue)
    await userEvent.click(
      screen.getByRole('button', { name: 'Clear the address' })
    )
    vi.mocked(fake.instance.setView).mockClear()
    await userEvent.click(useEast)

    expect(fake.instance.setView).toHaveBeenLastCalledWith(
      { center: east, zoom: 16 },
      { animate: true }
    )
  })

  it('brings a place set from outside into view, at street level', async () => {
    const fake = fakeEngine()
    await renderMap(fake.engine, <PickerForm />)
    expect(fake.instance.setView).not.toHaveBeenCalled()

    await userEvent.click(
      screen.getByRole('button', { name: 'Use the east address' })
    )
    expect(fake.instance.setView).toHaveBeenLastCalledWith(
      { center: east, zoom: 16 },
      { animate: true }
    )
  })

  it('keeps a closer zoom when it brings a place into view', async () => {
    const fake = fakeEngine()
    await renderMap(fake.engine, <PickerForm />)
    act(() => fake.instance.setView({ zoom: 18 }))
    await userEvent.click(
      screen.getByRole('button', { name: 'Use the east address' })
    )

    expect(fake.instance.setView).toHaveBeenLastCalledWith(
      { center: east, zoom: 18 },
      { animate: true }
    )
  })

  it('leaves the map where it is for its own drops and nudges', async () => {
    const fake = fakeEngine()
    const onPick = vi.fn()
    await renderMap(fake.engine, <PickerForm onPick={onPick} />)
    await fake.click(east)
    pinButton().focus()
    await userEvent.keyboard('{ArrowUp}')

    expect(onPick).toHaveBeenCalledTimes(2)
    expect(fake.instance.setView).not.toHaveBeenCalled()
  })
})
