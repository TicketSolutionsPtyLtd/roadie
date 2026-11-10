'use client'

import { useEffect, useEffectEvent, useState } from 'react'

import { MagnifyingGlassIcon } from '@phosphor-icons/react'

import { Autocomplete } from '@oztix/roadie-components/autocomplete'
import { cn } from '@oztix/roadie-core/utils'

import { useMapContext } from './MapContext'
import { PLACE_ZOOM, type Place } from './place'

export type MapSearchProps = {
  /**
   * Places for the typed text, best first, such as from an address or place
   * search. Map waits for typing to pause before asking, and aborts `signal`
   * when the text changes, so pass it to `fetch`. It's never asked for empty
   * text.
   */
  suggest: (
    text: string,
    options: { signal: AbortSignal }
  ) => readonly Place[] | Promise<readonly Place[]>
  /**
   * A place was chosen. The map has already flown there; drop a pin with
   * `Map.Picker` or `Map.Marker` if the app needs one.
   */
  onPlaceSelect?: (place: Place) => void
  /** @default 'Search for a place' */
  placeholder?: string
  /**
   * Names the search for screen readers.
   * @default 'Search the map'
   */
  'aria-label'?: string
  className?: string
}

// Long enough to skip the letters of a word typed quickly.
const SUGGEST_AFTER = 250
const FAILED = 'Places couldn’t load. Try again.'

type Answer = { text: string; places: readonly Place[]; failed?: boolean }

const placeKey = (place: Place) =>
  place.source
    ? `${place.source.provider}:${place.source.id}`
    : `${place.label}@${place.position.lat},${place.position.lng}`

/**
 * Searches for a place over the map's top corner. Choosing one flies the map
 * there.
 */
export function MapSearch({
  suggest,
  onPlaceSelect,
  placeholder = 'Search for a place',
  'aria-label': label = 'Search the map',
  className
}: MapSearchProps) {
  const { instance, frame, portalContainer, ignoreClickFrom } =
    useMapContext('Map.Search')
  // The input's text, and the text last typed, which a choice doesn't change.
  const [text, setText] = useState('')
  const [typed, setTyped] = useState('')
  const [answer, setAnswer] = useState<Answer | null>(null)
  // Counts the times a failed search was asked again.
  const [retries, setRetries] = useState(0)
  const wanted = typed.trim()
  const ask = useEffectEvent((text: string, signal: AbortSignal) =>
    suggest(text, { signal })
  )

  useEffect(() => {
    if (!wanted) return
    // New text aborts the last request, so its late answer never lands.
    const request = new AbortController()
    const timer = setTimeout(async () => {
      let next: Answer
      try {
        next = { text: wanted, places: await ask(wanted, request.signal) }
      } catch {
        next = { text: wanted, places: [], failed: true }
      }
      if (!request.signal.aborted) setAnswer(next)
    }, SUGGEST_AFTER)
    return () => {
      clearTimeout(timer)
      request.abort()
    }
  }, [wanted, retries])

  // The last answer stays listed while the next loads, but can't be chosen,
  // so Enter never takes a place for older text.
  const places = wanted && answer ? answer.places : []
  const current = wanted && answer?.text === wanted ? answer : null
  const stale = !current
  let message = ''
  if (wanted && !current) message = 'Searching…'
  else if (current?.failed) message = FAILED
  else if (current && places.length === 0) message = 'No places found'
  else if (current)
    message = `${places.length} ${places.length === 1 ? 'place' : 'places'} found`

  const choose = (place: Place) => {
    instance?.setView(
      { center: place.position, zoom: place.zoom ?? PLACE_ZOOM },
      { animate: true }
    )
    onPlaceSelect?.(place)
  }

  return (
    <div
      data-slot='map-search'
      className={cn(
        'absolute top-(--map-inset-top) right-(--map-search-right) left-(--map-inset-left) z-10 max-w-80',
        className
      )}
    >
      <Autocomplete
        items={places}
        // The places come in the order suggest ranks them.
        filter={null}
        itemToStringValue={(place) => (place as Place).label}
        value={text}
        onValueChange={(next, details) => {
          setText(next)
          // Choosing fills in the place's name, which isn't a new search.
          if (details.reason === 'item-press') return
          setTyped(next)
          // Cleared, the next search starts with nothing listed.
          if (!next.trim()) setAnswer(null)
        }}
        onOpenChange={(open, details) => {
          // Reopening the list asks a failed search again.
          if (open && current?.failed) {
            setAnswer(null)
            setRetries((count) => count + 1)
          }
          // A press on the map that closes the list only closes it, so a
          // picker's pin stays where it was.
          const target = details.event?.target
          if (
            !open &&
            details.reason === 'outside-press' &&
            target instanceof Node &&
            frame.current?.contains(target)
          )
            ignoreClickFrom(details.event)
        }}
      >
        <Autocomplete.InputGroup size='sm' className='gap-2 shadow-md'>
          <MagnifyingGlassIcon
            weight='bold'
            className='size-4 shrink-0 text-subtle'
          />
          <Autocomplete.Input aria-label={label} placeholder={placeholder} />
          <Autocomplete.Clear aria-label='Clear search' />
        </Autocomplete.InputGroup>
        <Autocomplete.Status>{message}</Autocomplete.Status>
        {/* While the map fills the window, the list opens inside it, so it
            shows over the map and the map's focus trap lets it be used. */}
        <Autocomplete.Portal container={portalContainer ?? undefined}>
          <Autocomplete.Positioner>
            <Autocomplete.Popup>
              <Autocomplete.List>
                {(place: Place) => (
                  <Autocomplete.Item
                    key={placeKey(place)}
                    value={place}
                    disabled={stale}
                    // A click, a tap and Enter all click the item.
                    onClick={() => {
                      if (!stale) choose(place)
                    }}
                  >
                    <span className='grid min-w-0'>
                      <span className='truncate'>{place.label}</span>
                      {place.address && (
                        <span className='truncate text-xs text-subtle'>
                          {place.address}
                        </span>
                      )}
                    </span>
                  </Autocomplete.Item>
                )}
              </Autocomplete.List>
              {/* Autocomplete.Status announces the message, so the list's
                  copy of it stays quiet. */}
              <Autocomplete.Empty
                aria-live='off'
                className={cn(current?.failed && 'intent-danger')}
              >
                {message}
              </Autocomplete.Empty>
            </Autocomplete.Popup>
          </Autocomplete.Positioner>
        </Autocomplete.Portal>
      </Autocomplete>
    </div>
  )
}

MapSearch.displayName = 'Map.Search'
